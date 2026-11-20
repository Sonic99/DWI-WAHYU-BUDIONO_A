import React, { useState } from 'react';
import { SchoolProfile, User } from '../types';
import { OfficialKopSurat } from './OfficialKopSurat';
import { Building2, Save, Mail, CheckCircle2 } from 'lucide-react';

interface SchoolProfileViewProps {
  profile: SchoolProfile;
  currentUser: User;
  onSaveProfile: (profile: SchoolProfile) => void;
}

export const SchoolProfileView: React.FC<SchoolProfileViewProps> = ({
  profile,
  currentUser,
  onSaveProfile
}) => {
  const [formData, setFormData] = useState<SchoolProfile>({ ...profile });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Profil Satuan Pendidikan & Konfigurasi Kop Surat Dinas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Format baku kop surat resmi, identitas instansi, pejabat penandatangan, dan surel cadangan database.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Perubahan Profil Berhasil Disimpan</span>
          </div>
        )}
      </div>

      {/* Live Preview of Kop Surat */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
          Pratinjau Kop Surat Kedinasan SMAN 9 Surabaya
        </h3>
        <div className="border border-dashed border-slate-300 p-4 rounded bg-slate-50/50">
          <OfficialKopSurat profile={formData} />
        </div>
      </div>

      {/* Kelola Logo Sekolah */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Pengaturan & Ubah Logo Kop Surat
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Unggah file logo sekolah sendiri atau pilih lambang resmi kedinasan. Logo akan langsung tampil pada seluruh cetakan surat dinas, disposisi, dan rekap agenda.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Opsi 1: Unggah Logo Baru */}
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/60 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">Unggah Logo Sekolah (PNG / JPG / SVG / WebP)</h4>
            <p className="text-[11px] text-slate-600">
              Pilih file gambar logo dari perangkat komputer Anda. Sistem akan mengonversinya secara otomatis untuk disimpan di database lokal.
            </p>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded font-semibold text-xs transition-colors flex items-center gap-2">
                <span>Pilih Berkas Logo...</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('Ukuran berkas logo maksimal 2 MB untuk performa optimal.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setFormData({
                          ...formData,
                          logoUrl: result,
                          logoType: 'custom'
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoUrl: '', logoType: 'default' })}
                  className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded font-medium text-xs transition-colors"
                >
                  Gunakan Logo Vektor Bawaan
                </button>
              )}
            </div>

            {formData.logoUrl && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Logo kustom aktif terpasang pada kop surat</span>
              </div>
            )}
          </div>

          {/* Opsi 2: Pilihan Preset Logo Kedinasan */}
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/60 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">Pilihan Lambang & Preset Resmi</h4>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => setFormData({ 
                  ...formData, 
                  logoUrl: '',
                  logoType: 'pemprov' 
                })}
                className={`p-2.5 rounded border text-left transition-all ${
                  !formData.logoUrl && (!formData.logoType || formData.logoType === 'pemprov' || formData.logoType === 'preset_jatim')
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold ring-1 ring-blue-600' 
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">Pemprov Jawa Timur (Resmi Kiri)</div>
                <div className="text-[10px] text-slate-500">Jer Basuki Mawa Beya · Dinas Pendidikan</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, logoUrl: '', logoType: 'default' })}
                className={`p-2.5 rounded border text-left transition-all ${
                  !formData.logoUrl && (formData.logoType === 'default' || formData.logoType === 'default_vector')
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold ring-1 ring-blue-600' 
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">SMANIX Emas Vektor</div>
                <div className="text-[10px] text-slate-500">Lambang perisai resmi SMAN 9 Surabaya</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Settings */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-100">
          Informasi Satuan Pendidikan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">
              Nama Resmi Sekolah:
            </label>
            <input
              type="text"
              required
              value={formData.namaSekolah}
              onChange={e => setFormData({ ...formData, namaSekolah: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-blue-950 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              NPSN (Nomor Pokok Sekolah):
            </label>
            <input
              type="text"
              required
              value={formData.npsn}
              onChange={e => setFormData({ ...formData, npsn: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Alamat Jalan & Kelurahan/Kecamatan:
            </label>
            <input
              type="text"
              required
              value={formData.alamat}
              onChange={e => setFormData({ ...formData, alamat: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Kota:
              </label>
              <input
                type="text"
                value={formData.kota}
                onChange={e => setFormData({ ...formData, kota: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Provinsi:
              </label>
              <input
                type="text"
                value={formData.provinsi}
                onChange={e => setFormData({ ...formData, provinsi: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Kode Pos:
              </label>
              <input
                type="text"
                value={formData.kodePos}
                onChange={e => setFormData({ ...formData, kodePos: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Telepon:
            </label>
            <input
              type="text"
              value={formData.telepon}
              onChange={e => setFormData({ ...formData, telepon: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Faksimili:
            </label>
            <input
              type="text"
              value={formData.faksimili || ''}
              onChange={e => setFormData({ ...formData, faksimili: e.target.value })}
              placeholder="(031) 5477817"
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Laman Website:
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={e => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Pos-el / Surel Resmi:
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Surel Default Backup Database (Pencadangan Cloud):
            </label>
            <input
              type="email"
              value={formData.emailBackupDefault}
              onChange={e => setFormData({ ...formData, emailBackupDefault: e.target.value })}
              className="w-full px-3 py-1.5 border border-purple-300 bg-purple-50/40 rounded font-mono text-purple-950 font-semibold"
            />
          </div>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pt-4 pb-2 border-b border-slate-100">
          Pejabat Pengesah Kedinasan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded">
            <h4 className="font-bold text-slate-900">Kepala Sekolah (Pengesah Utama)</h4>
            <div>
              <label className="block text-slate-600 mb-1">Nama Lengkap & Gelar:</label>
              <input
                type="text"
                value={formData.kepalaSekolah}
                onChange={e => setFormData({ ...formData, kepalaSekolah: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">NIP Kepala Sekolah:</label>
              <input
                type="text"
                value={formData.nipKepalaSekolah}
                onChange={e => setFormData({ ...formData, nipKepalaSekolah: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Pangkat / Golongan:</label>
              <input
                type="text"
                value={formData.pangkatKepsek}
                onChange={e => setFormData({ ...formData, pangkatKepsek: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
          </div>

          <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded">
            <h4 className="font-bold text-slate-900">Kepala Tata Usaha (Pengelola Administrasi)</h4>
            <div>
              <label className="block text-slate-600 mb-1">Nama Lengkap & Gelar:</label>
              <input
                type="text"
                value={formData.kepalaTU}
                onChange={e => setFormData({ ...formData, kepalaTU: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">NIP Kepala TU:</label>
              <input
                type="text"
                value={formData.nipKepalaTU}
                onChange={e => setFormData({ ...formData, nipKepalaTU: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Konfigurasi</span>
          </button>
        </div>
      </form>
    </div>
  );
};
