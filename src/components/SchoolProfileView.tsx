import React, { useState, useEffect } from 'react';
import { SchoolProfile, User } from '../types';
import { OfficialKopSurat } from './OfficialKopSurat';
import { PemprovJatimLogo, Sman9SurabayaLogoSvg } from './OfficialStamps';
import { resolveDirectImageUrl } from './ExamCardBarcode';
import { Save, CheckCircle2, Upload, Link2, RotateCcw, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface SchoolProfileViewProps {
  profile: SchoolProfile;
  currentUser: User;
  onSaveProfile: (profile: SchoolProfile) => void;
}

export const SchoolProfileView: React.FC<SchoolProfileViewProps> = ({
  profile,
  onSaveProfile
}) => {
  const [formData, setFormData] = useState<SchoolProfile>({ ...profile });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedNote, setSavedNote] = useState('Perubahan Profil Berhasil Disimpan');
  const [logoError, setLogoError] = useState('');

  // State input URL web terpisah untuk masing-masing slot logo
  const [pemprovLinkInput, setPemprovLinkInput] = useState(
    profile.pemprovLogoUrl && !profile.pemprovLogoUrl.startsWith('data:') ? profile.pemprovLogoUrl : ''
  );
  const [sekolahLinkInput, setSekolahLinkInput] = useState(
    profile.sekolahLogoUrl && !profile.sekolahLogoUrl.startsWith('data:') ? profile.sekolahLogoUrl : ''
  );
  const [kopLinkInput, setKopLinkInput] = useState(
    profile.logoUrl && !profile.logoUrl.startsWith('data:') ? profile.logoUrl : ''
  );

  useEffect(() => {
    setFormData({ ...profile });
    if (profile.pemprovLogoUrl && !profile.pemprovLogoUrl.startsWith('data:')) {
      setPemprovLinkInput(profile.pemprovLogoUrl);
    }
    if (profile.sekolahLogoUrl && !profile.sekolahLogoUrl.startsWith('data:')) {
      setSekolahLinkInput(profile.sekolahLogoUrl);
    }
    if (profile.logoUrl && !profile.logoUrl.startsWith('data:')) {
      setKopLinkInput(profile.logoUrl);
    }
  }, [profile]);

  const applyAndSaveLogoUpdate = (nextProfile: SchoolProfile, message: string) => {
    setLogoError('');
    setFormData(nextProfile);
    onSaveProfile(nextProfile);
    setSavedNote(message);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleUploadImageFile = (
    file: File | undefined,
    target: 'pemprov' | 'sekolah' | 'kop'
  ) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Ukuran berkas logo maksimal 2 MB agar penyimpanan tetap ringan dan cepat.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;
      if (target === 'pemprov') {
        setPemprovLinkInput('');
        applyAndSaveLogoUpdate(
          { ...formData, pemprovLogoUrl: result },
          'Logo Pemprov Jatim (Upload) berhasil disimpan & diterapkan'
        );
      } else if (target === 'sekolah') {
        setSekolahLinkInput('');
        applyAndSaveLogoUpdate(
          { ...formData, sekolahLogoUrl: result },
          'Logo SMA / Sekolah (Upload) berhasil disimpan & diterapkan'
        );
      } else {
        setKopLinkInput('');
        applyAndSaveLogoUpdate(
          { ...formData, logoUrl: result, logoType: 'custom' },
          'Logo Kustom Kop Surat (Upload) berhasil disimpan & diterapkan'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyWebLink = (target: 'pemprov' | 'sekolah' | 'kop') => {
    const raw =
      target === 'pemprov'
        ? pemprovLinkInput.trim()
        : target === 'sekolah'
          ? sekolahLinkInput.trim()
          : kopLinkInput.trim();

    if (!raw) {
      setLogoError('Masukkan tautan/URL gambar dari web atau Google Drive terlebih dahulu.');
      return;
    }

    const normalized = resolveDirectImageUrl(raw);
    if (target === 'pemprov') {
      applyAndSaveLogoUpdate(
        { ...formData, pemprovLogoUrl: normalized },
        'Link web Logo Pemprov Jatim berhasil diterapkan'
      );
    } else if (target === 'sekolah') {
      applyAndSaveLogoUpdate(
        { ...formData, sekolahLogoUrl: normalized },
        'Link web Logo SMA / Sekolah berhasil diterapkan'
      );
    } else {
      applyAndSaveLogoUpdate(
        { ...formData, logoUrl: normalized, logoType: 'custom' },
        'Link web Logo Kustom Kop berhasil diterapkan'
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedNote('Perubahan Profil Berhasil Disimpan');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const activeKopIsPemprov =
    !formData.logoUrl && (!formData.logoType || formData.logoType === 'pemprov' || formData.logoType === 'preset_jatim');
  const activeKopIsSekolah =
    !formData.logoUrl && (formData.logoType === 'default' || formData.logoType === 'default_vector');
  const activeKopIsCustom = formData.logoType === 'custom' && Boolean(formData.logoUrl);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Profil Satuan Pendidikan & Konfigurasi Kop Surat Dinas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Format baku kop surat resmi, pengaturan Logo Pemprov Jatim & Logo SMA (Upload / Link Web), pejabat penandatangan, dan surel cadangan database.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNote}</span>
          </div>
        )}
      </div>

      {/* Live Preview of Kop Surat */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
          Pratinjau Kop Surat Kedinasan {formData.namaSekolah}
        </h3>
        <div className="border border-dashed border-slate-300 p-4 rounded bg-slate-50/50">
          <OfficialKopSurat profile={formData} />
        </div>
      </div>

      {/* Kelola Logo Pemprov Jatim & Logo SMA */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Pengaturan Logo Pemprov Jawa Timur & Logo SMA (Upload / Link Web)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ubah masing-masing logo dengan mengunggah berkas gambar atau menempelkan tautan gambar dari internet / Google Drive. Perubahan langsung diterapkan ke Kop Surat, Rapor, Buku Induk, Kartu Ujian, Panitia, dan Tempel Ruang.
            </p>
          </div>
        </div>

        {logoError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{logoError}</span>
          </div>
        )}

        {/* Dua Panel Pengaturan Logo Utama: Pemprov Jatim & SMA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Panel 1: Logo Pemprov Jawa Timur */}
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-16 h-18 rounded-md border border-slate-300 bg-white p-1.5 flex items-center justify-center shrink-0">
                <PemprovJatimLogo customUrl={formData.pemprovLogoUrl} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-xs">1. Logo Pemerintah Provinsi Jawa Timur</h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      formData.pemprovLogoUrl
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {formData.pemprovLogoUrl ? 'Kustom Aktif' : 'Resmi Bawaan'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Dipakai pada posisi kiri Kop Surat Dinas, Kartu Ujian/Panitia, dan Pengumuman Ruang (posisi tetap di kiri).
                </p>
              </div>
            </div>

            {/* Upload dari Perangkat */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-colors inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Logo Pemprov</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadImageFile(e.target.files?.[0], 'pemprov');
                    e.target.value = '';
                  }}
                />
              </label>

              {formData.pemprovLogoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPemprovLinkInput('');
                    applyAndSaveLogoUpdate(
                      { ...formData, pemprovLogoUrl: '' },
                      'Logo Pemprov Jatim dikembalikan ke lambang resmi bawaan'
                    );
                  }}
                  className="px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 bg-white border border-rose-200 rounded font-medium text-xs inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Bawaan</span>
                </button>
              )}
            </div>

            {/* Link dari Web */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Atau Tempel Link / URL Gambar dari Web (PNG / JPG / Google Drive):
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={pemprovLinkInput}
                    onChange={(e) => setPemprovLinkInput(e.target.value)}
                    placeholder="https://.../logo-pemprov-jatim.png"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyWebLink('pemprov')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-xs shrink-0 transition-colors"
                >
                  Terapkan Link
                </button>
              </div>
            </div>
          </div>

          {/* Panel 2: Logo SMA / Sekolah (SMAN 9 Surabaya) */}
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-16 h-18 rounded-md border border-slate-300 bg-white p-1.5 flex items-center justify-center shrink-0">
                <Sman9SurabayaLogoSvg customUrl={formData.sekolahLogoUrl} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-xs">2. Logo SMA / Satuan Pendidikan</h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      formData.sekolahLogoUrl
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {formData.sekolahLogoUrl ? 'Kustom Aktif' : 'Resmi Bawaan'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Dipakai pada Sampul/Halaman Muka Rapor, Background Watermark Rapor & Buku Induk, Header Aplikasi, dan Kop/Kartu mode Logo SMA.
                </p>
              </div>
            </div>

            {/* Upload dari Perangkat */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition-colors inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Logo SMA</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadImageFile(e.target.files?.[0], 'sekolah');
                    e.target.value = '';
                  }}
                />
              </label>

              {formData.sekolahLogoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setSekolahLinkInput('');
                    applyAndSaveLogoUpdate(
                      { ...formData, sekolahLogoUrl: '' },
                      'Logo SMA dikembalikan ke lambang resmi bawaan SMAN 9 Surabaya'
                    );
                  }}
                  className="px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 bg-white border border-rose-200 rounded font-medium text-xs inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Bawaan</span>
                </button>
              )}
            </div>

            {/* Link dari Web */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Atau Tempel Link / URL Gambar dari Web (PNG / JPG / Google Drive):
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={sekolahLinkInput}
                    onChange={(e) => setSekolahLinkInput(e.target.value)}
                    placeholder="https://.../logo-sman9-surabaya.png"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyWebLink('sekolah')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-xs shrink-0 transition-colors"
                >
                  Terapkan Link
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pilihan Lambang Aktif pada Kop Surat & Kartu */}
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-bold text-slate-800 text-xs">
              Logo Utama yang Ditampilkan pada Kop Surat, Kartu Ujian, Kartu Panitia & Ruang
            </h4>
            <span className="text-[11px] text-slate-500">
              Posisi logo Kop Surat tetap di sebelah kiri sesuai tata naskah dinas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            <button
              type="button"
              onClick={() =>
                applyAndSaveLogoUpdate(
                  { ...formData, logoUrl: '', logoType: 'pemprov' },
                  'Kop Surat diatur menggunakan Logo Pemprov Jawa Timur'
                )
              }
              className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                activeKopIsPemprov
                  ? 'border-blue-600 bg-blue-50/90 text-blue-950 font-semibold ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
              }`}
            >
              <PemprovJatimLogo customUrl={formData.pemprovLogoUrl} className="w-9 h-10 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs">Pakai Logo Pemprov Jatim</div>
                <div className="text-[10px] text-slate-500">Mengikuti setting Logo Pemprov di atas</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyAndSaveLogoUpdate(
                  { ...formData, logoUrl: '', logoType: 'default' },
                  'Kop Surat diatur menggunakan Logo SMA / Sekolah'
                )
              }
              className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                activeKopIsSekolah
                  ? 'border-blue-600 bg-blue-50/90 text-blue-950 font-semibold ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
              }`}
            >
              <Sman9SurabayaLogoSvg customUrl={formData.sekolahLogoUrl} className="w-9 h-10 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs">Pakai Logo SMA / Sekolah</div>
                <div className="text-[10px] text-slate-500">Mengikuti setting Logo SMA di atas</div>
              </div>
            </button>

            <div
              className={`p-3 rounded-lg border text-left space-y-2 ${
                activeKopIsCustom
                  ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {activeKopIsCustom ? (
                    <img
                      src={resolveDirectImageUrl(formData.logoUrl)}
                      alt="Logo Kustom Kop"
                      className="w-8 h-9 object-contain shrink-0 bg-white rounded border border-slate-200 p-0.5"
                    />
                  ) : (
                    <div className="w-8 h-9 rounded border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 shrink-0">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-xs text-slate-900">Logo Khusus Kop (Opsional)</div>
                    <div className="text-[10px] text-slate-500">Upload / Link terpisah khusus Kop</div>
                  </div>
                </div>
                {activeKopIsCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      setKopLinkInput('');
                      applyAndSaveLogoUpdate(
                        { ...formData, logoUrl: '', logoType: 'pemprov' },
                        'Logo khusus Kop dihapus'
                      );
                    }}
                    className="text-[10px] font-semibold text-rose-600 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <label className="cursor-pointer px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium text-[11px] shrink-0">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleUploadImageFile(e.target.files?.[0], 'kop');
                      e.target.value = '';
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={kopLinkInput}
                  onChange={(e) => setKopLinkInput(e.target.value)}
                  placeholder="Link web logo kop..."
                  className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-[11px] font-mono bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleApplyWebLink('kop')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-[11px] shrink-0"
                >
                  Pakai
                </button>
              </div>
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
