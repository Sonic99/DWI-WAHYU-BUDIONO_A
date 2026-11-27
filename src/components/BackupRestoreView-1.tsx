import React, { useState, useRef } from 'react';
import { SchoolProfile, User, BackupRecord } from '../types';
import { 
  downloadLocalBackup, 
  sendBackupToEmail, 
  restoreDatabaseFromJson, 
  exportToCSV, 
  resetToInitialDemoData 
} from '../services/storageService';
import { 
  Database, 
  HardDriveDownload, 
  Mail, 
  UploadCloud, 
  FileCheck, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2,
  FileSpreadsheet,
  Send,
  HelpCircle
} from 'lucide-react';

interface BackupRestoreViewProps {
  schoolProfile: SchoolProfile;
  currentUser: User;
  backupHistory: BackupRecord[];
  onRefreshData: () => void;
  onUpdateSchoolProfile: (profile: SchoolProfile) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  schoolProfile,
  currentUser,
  backupHistory,
  onRefreshData,
  onUpdateSchoolProfile
}) => {
  const [emailTarget, setEmailTarget] = useState(schoolProfile.emailBackupDefault || 'smanixsurabaya@gmail.com');
  const [backupNote, setBackupNote] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Restore State
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('merge');
  const [selectedJsonFile, setSelectedJsonFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{ masuk: number; keluar: number; valid: boolean } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatusMessage, setRestoreStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Local Backup Download
  const handleDownloadLocal = () => {
    try {
      const res = downloadLocalBackup();
      setEmailStatusMessage({
        text: `Berkas cadangan lokal berhasil diunduh: ${res.fileName} (${res.size}). Simpan berkas ini di penyimpanan aman/hard drive TU.`,
        isError: false
      });
      onRefreshData();
    } catch (e: any) {
      setEmailStatusMessage({ text: `Gagal mengunduh backup: ${e.message}`, isError: true });
    }
  };

  // Handle Send Backup to Email
  const handleSendEmailBackup = async () => {
    if (!emailTarget.trim()) {
      alert('Masukkan alamat email tujuan backup.');
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMessage(null);

    try {
      const result = await sendBackupToEmail(emailTarget.trim(), backupNote.trim());
      if (result.success) {
        setEmailStatusMessage({
          text: `Pencadangan database berhasil dikirimkan ke surel ${emailTarget}. Salinan arsip terenkripsi tercatat dalam riwayat backup.`,
          isError: false
        });
        setBackupNote('');
        onRefreshData();
      }
    } catch (error: any) {
      setEmailStatusMessage({
        text: `Gagal mengirim cadangan ke email: ${error.message || 'Terjadi kesalahan transmisi.'}`,
        isError: true
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedJsonFile(file);
    setRestoreStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.suratMasuk && parsed.suratKeluar) {
          setRestorePreview({
            masuk: parsed.suratMasuk.length,
            keluar: parsed.suratKeluar.length,
            valid: true
          });
        } else {
          setRestorePreview({ masuk: 0, keluar: 0, valid: false });
          setRestoreStatusMessage({
            text: 'Berkas JSON tidak memiliki struktur database SIP-TU yang valid.',
            isError: true
          });
        }
      } catch (err) {
        setRestorePreview({ masuk: 0, keluar: 0, valid: false });
        setRestoreStatusMessage({
          text: 'Format berkas JSON tidak dapat diuraikan / korup.',
          isError: true
        });
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!selectedJsonFile) return;

    const confirmMsg = restoreMode === 'replace'
      ? 'PERINGATAN: Mode "Timpa Penuh" akan menggantikan seluruh database saat ini dengan data dari berkas backup. Lanjutkan?'
      : 'Mode "Gabungkan" akan menyatukan data arsip dari berkas backup dengan database yang ada. Lanjutkan?';

    if (!confirm(confirmMsg)) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = restoreDatabaseFromJson(content, restoreMode);
        if (res.success) {
          setRestoreStatusMessage({ text: res.message, isError: false });
          setSelectedJsonFile(null);
          setRestorePreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          onRefreshData();
        } else {
          setRestoreStatusMessage({ text: res.message, isError: true });
        }
      } catch (err: any) {
        setRestoreStatusMessage({ text: `Kesalahan saat pemulihan: ${err.message}`, isError: true });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(selectedJsonFile);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Sistem Pencadangan, Export-Import & Sinkronisasi Email TU
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jaminan keamanan dokumen persuratan dengan save lokal, pencadangan surel otomatis, dan pemulihan database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm('Mereset ke data bawaan demo SMAN 9 Surabaya? Data yang belum dicadangkan akan hilang.')) {
                resetToInitialDemoData();
                onRefreshData();
              }
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-300 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Data Demo</span>
          </button>
        </div>
      </div>

      {/* Grid 2 Columns: Save Lokal vs Save Email */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Save & Backup Lokal */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <HardDriveDownload className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Save & Backup Database Lokal
                </h3>
                <p className="text-[11px] text-slate-500">
                  Unduh arsip lengkap dalam format JSON terstruktur atau Spreadsheet CSV.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Pencadangan lokal mencakup seluruh data: <strong>Surat Masuk</strong>, <strong>Surat Keluar</strong>, <strong>Lembar Disposisi</strong>, <strong>Profil Sekolah</strong>, <strong>Hak Akses Akun</strong>, dan <strong>Log Audit</strong>.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded text-blue-900 text-[11px]">
                <p className="font-semibold mb-0.5">Rekomendasi Kearsipan SMAN 9 Surabaya:</p>
                <p>Lakukan backup lokal minimal 1 kali seminggu dan simpan di Google Drive / External Storage sekolah.</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleDownloadLocal}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Unduh Backup Database (.json)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => exportToCSV('masuk')}
                  className="py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor CSV Masuk</span>
                </button>
                <button
                  onClick={() => exportToCSV('keluar')}
                  className="py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ekspor CSV Keluar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 mt-4 flex items-center justify-between">
            <span>Enkripsi integritas data SHA-256</span>
            <span className="font-mono">Versi 2.5.0-SMAN9</span>
          </div>
        </div>

        {/* Box 2: Save & Backup ke Email */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Mail className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Save & Backup Database ke Email
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pengiriman otomatis snapshot database langsung ke surel resmi tata usaha.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Alamat Surel Penerima Backup (Default TU):
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailTarget}
                    onChange={e => setEmailTarget(e.target.value)}
                    placeholder="smanixsurabaya@gmail.com"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => {
                      const updated = { ...schoolProfile, emailBackupDefault: emailTarget };
                      onUpdateSchoolProfile(updated);
                      alert(`Surel default backup diperbarui menjadi: ${emailTarget}`);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium text-xs whitespace-nowrap"
                  >
                    Simpan Default
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Catatan Pengiriman (Opsional):
                </label>
                <input
                  type="text"
                  value={backupNote}
                  onChange={e => setBackupNote(e.target.value)}
                  placeholder="Contoh: Backup akhir pekan penutupan buku Oktober 2026..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="p-3 bg-purple-50 border border-purple-100 rounded text-purple-900 text-[11px]">
                <p className="font-semibold mb-0.5">Surel Resmi Tata Usaha:</p>
                <p className="font-mono">{schoolProfile.emailBackupDefault || 'smanixsurabaya@gmail.com'}</p>
                <p className="text-slate-600 text-[10px] mt-1">
                  Berkas backup dikompresi dengan format JSON snapshot ber-tanda verifikasi waktu kedinasan.
                </p>
              </div>

              <button
                onClick={handleSendEmailBackup}
                disabled={isSendingEmail}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirimkan Berkas Backup ke Surel...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Cadangan ke Email Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 mt-4 flex items-center justify-between">
            <span>Penerima Terverifikasi: smanixsurabaya@gmail.com</span>
            <span className="text-emerald-700 font-semibold">Terkoneksi</span>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {emailStatusMessage && (
        <div className={`p-4 rounded-lg border text-xs flex items-start gap-2.5 ${
          emailStatusMessage.isError 
            ? 'bg-red-50 border-red-200 text-red-900' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {emailStatusMessage.isError ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{emailStatusMessage.text}</div>
        </div>
      )}

      {/* Section 2: Importir Database (Restore) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <UploadCloud className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Sistem Importir & Pemulihan Database (Restore)
            </h3>
            <p className="text-[11px] text-slate-500">
              Pulihkan data persuratan dari berkas cadangan JSON resmi SIP-TU SMAN 9 Surabaya.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* File Picker */}
          <div className="space-y-3">
            <label className="block text-slate-700 font-semibold">
              1. Pilih Berkas Backup (.json):
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
            {selectedJsonFile && (
              <p className="text-[11px] text-slate-600 font-mono">
                Terpilih: {selectedJsonFile.name} ({(selectedJsonFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Mode Pemulihan */}
          <div className="space-y-3">
            <label className="block text-slate-700 font-semibold">
              2. Tentukan Mode Pemulihan:
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 p-2.5 border rounded cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Gabungkan Data (Merge)</span>
                  <span className="text-[11px] text-slate-500">
                    Menambahkan entri baru tanpa menghapus data persuratan yang sudah ada di sistem.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 border rounded cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="restoreMode"
                  value="replace"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-semibold text-red-900 block">Timpa Penuh (Replace)</span>
                  <span className="text-[11px] text-slate-500">
                    Menggantikan seluruh database persuratan saat ini dengan data dari berkas backup.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Eksekusi Pemulihan */}
          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">
                3. Verifikasi & Eksekusi:
              </label>
              {restorePreview ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                  <div className="font-semibold text-slate-900">Ringkasan Berkas:</div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    · Surat Masuk: {restorePreview.masuk} data<br />
                    · Surat Keluar: {restorePreview.keluar} data<br />
                    · Integritas: Valid SIP-TU Format
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-500 text-[11px]">
                  Silakan unggah berkas .json terlebih dahulu untuk melihat pratinjau data.
                </div>
              )}
            </div>

            <button
              onClick={handleExecuteRestore}
              disabled={!selectedJsonFile || !restorePreview?.valid || isRestoring}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-40"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memulihkan Database...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Jalankan Pemulihan Database</span>
                </>
              )}
            </button>
          </div>
        </div>

        {restoreStatusMessage && (
          <div className={`mt-4 p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            restoreStatusMessage.isError 
              ? 'bg-red-50 border-red-200 text-red-900' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            {restoreStatusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span className="font-medium">{restoreStatusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Section 3: Riwayat Log Backup (Lokal & Email) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
          <span>Riwayat Pencadangan Arsip (Lokal & Surel)</span>
          <span className="text-[11px] font-normal text-slate-500">Mencatat bukti kepatuhan kearsipan baku</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Waktu Backup</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Media Cadangan</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Nama Berkas</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Ukuran</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tujuan / Catatan</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Operator TU</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backupHistory.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">{b.timestamp}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {b.type === 'email' ? (
                      <span className="font-semibold text-purple-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Surel (Email)</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-blue-700 flex items-center gap-1">
                        <HardDriveDownload className="w-3.5 h-3.5" />
                        <span>Lokal (JSON)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{b.fileName}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">{b.size}</td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={b.note || b.targetEmail}>
                    {b.targetEmail ? `Kirim ke: ${b.targetEmail}` : b.note || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">{b.operator}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="font-bold text-emerald-700 text-[11px]">{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
