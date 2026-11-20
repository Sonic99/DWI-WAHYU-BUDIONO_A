import React from 'react';
import { 
  Inbox, 
  Send, 
  FileCheck2, 
  AlertCircle, 
  ArrowRight, 
  Mail, 
  Printer, 
  Clock, 
  CheckCircle2, 
  FileText,
  ShieldCheck,
  HardDriveDownload
} from 'lucide-react';
import { SuratMasuk, SuratKeluar, User, SchoolProfile } from '../types';

interface DashboardOverviewProps {
  suratMasuk: SuratMasuk[];
  suratKeluar: SuratKeluar[];
  currentUser: User;
  schoolProfile: SchoolProfile;
  onNavigate: (tab: string) => void;
  onOpenInputMasuk: () => void;
  onOpenInputKeluar: () => void;
  onTriggerEmailBackup: () => void;
  onOpenPrintDisposisi: (surat: SuratMasuk) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  suratMasuk,
  suratKeluar,
  currentUser,
  schoolProfile,
  onNavigate,
  onOpenInputMasuk,
  onOpenInputKeluar,
  onTriggerEmailBackup,
  onOpenPrintDisposisi
}) => {
  const butuhDisposisi = suratMasuk.filter(s => s.status === 'Baru' || s.status === 'Menunggu Disposisi');
  const prosesDisposisi = suratMasuk.filter(s => s.status === 'Didisposisikan' || s.status === 'Dalam Proses');
  const suratKeluarDraf = suratKeluar.filter(s => s.status === 'Draf' || s.status === 'Review KTU');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">
            Sistem Informasi Pengelolaan Persuratan Tata Usaha
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Selamat Datang, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {currentUser.jabatan} {currentUser.nip ? `· NIP. ${currentUser.nip}` : ''} · SMA Negeri 9 Surabaya
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(currentUser.role === 'admin_tu' || currentUser.role === 'staf_agenda') && (
            <>
              <button
                onClick={onOpenInputMasuk}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap shrink-0"
              >
                + Surat Masuk
              </button>
              <button
                onClick={onOpenInputKeluar}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors whitespace-nowrap shrink-0"
              >
                + Surat Keluar
              </button>
            </>
          )}
          <button
            onClick={onTriggerEmailBackup}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Kirim Backup ke Email TU</span>
          </button>
        </div>
      </div>

      {/* Alamat Web & Akses Sistem Card */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 text-white rounded-lg p-4 md:p-5 shadow-sm border border-blue-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
              Alamat Web Aplikasi
            </span>
            <span className="text-[11px] text-slate-300 font-mono">
              Tautan Akses Resmi Sistem Tata Usaha SMAN 9 Surabaya
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs md:text-sm text-blue-200 select-all">
            <span className="text-white font-bold">URL Aplikasi:</span>
            <span className="bg-slate-950/70 px-2.5 py-1 rounded border border-blue-800/60 text-amber-300 break-all">
              https://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-0.5">
            Portal Sekolah: <a href="https://sman9surabaya.sch.id" target="_blank" rel="noreferrer" className="text-blue-300 hover:underline">https://sman9surabaya.sch.id</a> · Surel: <span className="text-slate-300 font-mono">{schoolProfile.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              navigator.clipboard.writeText('https://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app');
              alert('Alamat web aplikasi berhasil disalin ke clipboard:\nhttps://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app');
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <span>Salin Alamat Web</span>
          </button>
          <a
            href="https://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Buka Laman</span>
          </a>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Surat Masuk */}
        <div 
          onClick={() => onNavigate('surat-masuk')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Surat Masuk Terdaftar</span>
            <Inbox className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {suratMasuk.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{butuhDisposisi.length} butuh disposisi</span>
            <span>·</span>
            <span>{prosesDisposisi.length} proses</span>
          </div>
        </div>

        {/* Card 2: Surat Keluar */}
        <div 
          onClick={() => onNavigate('surat-keluar')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-amber-400 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Surat Keluar Resmi</span>
            <Send className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {suratKeluar.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{suratKeluarDraf.length} proses review</span>
            <span>·</span>
            <span>{suratKeluar.filter(s => s.status === 'Sudah Dikirim').length} terkirim</span>
          </div>
        </div>

        {/* Card 3: Disposisi Aktif */}
        <div 
          onClick={() => onNavigate('surat-masuk')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-emerald-400 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Disposisi & Tindak Lanjut</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {suratMasuk.reduce((acc, s) => acc + s.disposisiList.length, 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{suratMasuk.filter(s => s.status === 'Selesai').length} terselesaikan</span>
          </div>
        </div>

        {/* Card 4: Status Backup Database */}
        <div 
          onClick={() => onNavigate('backup-restore')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-purple-400 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Cadangan Database</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xs font-semibold text-emerald-700 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tersinkronisasi Aman</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {schoolProfile.lastBackupDate || 'Tercadangkan hari ini'}
          </div>
        </div>
      </div>

      {/* Main Two-Column Workflow Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Antrean Surat Masuk Butuh Tindakan */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Surat Masuk Menunggu Disposisi / Tindakan
                </h3>
              </div>
              <button
                onClick={() => onNavigate('surat-masuk')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                Lihat Semua ({butuhDisposisi.length})
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {butuhDisposisi.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Semua surat masuk telah didisposisikan.
                </div>
              ) : (
                butuhDisposisi.slice(0, 4).map(surat => (
                  <div key={surat.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span>{surat.nomorAgenda}</span>
                        <span>·</span>
                        <span>{surat.tanggalTerima}</span>
                        <span>·</span>
                        <span className="font-sans font-semibold text-amber-700">{surat.sifat}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {surat.perihal}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        Asal: {surat.pengirim}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onOpenPrintDisposisi(surat)}
                        title="Cetak Lembar Disposisi"
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sifat surat penting/segera harus diproses dalam 1x24 jam</span>
            <button 
              onClick={() => onNavigate('surat-masuk')}
              className="font-medium text-blue-600 hover:underline"
            >
              Buka Agenda Masuk
            </button>
          </div>
        </div>

        {/* Right Column: Surat Keluar & Progres Persetujuan */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Draf & Pengesahan Surat Keluar SMANIX
                </h3>
              </div>
              <button
                onClick={() => onNavigate('surat-keluar')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                Lihat Semua ({suratKeluar.length})
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {suratKeluar.slice(0, 4).map(surat => (
                <div key={surat.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <span>{surat.nomorAgenda}</span>
                      <span>·</span>
                      <span>{surat.tanggalSurat}</span>
                      <span>·</span>
                      <span className="font-sans font-medium text-blue-800">{surat.status}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {surat.perihal}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      Tujuan: {surat.tujuan}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Nomor otomatis format kedinasan: 421.3/[No]/101.6.1.9/2026</span>
            <button 
              onClick={() => onNavigate('surat-keluar')}
              className="font-medium text-blue-600 hover:underline"
            >
              Kelola Surat Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Quick Info Bar for SMAN 9 Surabaya */}
      <div className="bg-slate-900 text-slate-300 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
            TU
          </div>
          <div>
            <div className="font-bold text-white">Sub Bagian Tata Usaha SMA Negeri 9 Surabaya</div>
            <div className="text-slate-400">
              {schoolProfile.alamat} · Telp: {schoolProfile.telepon} · Surel TU: {schoolProfile.email}
            </div>
            <div className="text-[11px] text-blue-300 flex items-center gap-2 mt-0.5">
              <span>Laman Web:</span>
              <a href="https://sman9surabaya.sch.id" target="_blank" rel="noreferrer" className="underline hover:text-white">
                https://sman9surabaya.sch.id
              </a>
              <span>·</span>
              <span>Web App:</span>
              <a href="https://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app" target="_blank" rel="noreferrer" className="text-amber-300 underline hover:text-white truncate max-w-xs">
                https://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div className="text-[11px]">
            <p className="text-slate-400">Kepala Tata Usaha:</p>
            <p className="font-semibold text-white">{schoolProfile.kepalaTU}</p>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div className="text-[11px]">
            <p className="text-slate-400">Kepala Sekolah:</p>
            <p className="font-semibold text-white">{schoolProfile.kepalaSekolah}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
