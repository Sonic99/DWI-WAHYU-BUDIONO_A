import React, { useState } from 'react';
import { 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  QrCode, 
  Share2, 
  ShieldCheck, 
  Laptop, 
  School 
} from 'lucide-react';
import { SchoolProfile } from '../types';

interface WebAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchoolProfile;
}

export const WebAddressModal: React.FC<WebAddressModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real App URLs from deployment environment
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app';
  const sharedAppUrl = 'https://ais-pre-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app';
  const devAppUrl = 'https://ais-dev-2waqh2e3rspoyfl7sl2xcz-924155175107.asia-east1.run.app';
  const officialSchoolWeb = profile.website || 'https://sman9surabaya.sch.id';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Alamat Web & Tautan Akses Aplikasi
              </h3>
              <p className="text-[11px] text-slate-300">
                SIP-TU SMA Negeri 9 Surabaya
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Berikut adalah alamat web resmi aplikasi persuratan dan laman portal sekolah yang dapat digunakan oleh Bapak/Ibu Guru, Staf TU, dan pimpinan untuk mengakses sistem:
          </p>

          {/* Card 1: Shared Production Web App URL */}
          <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <Laptop className="w-4 h-4 text-blue-600" />
                <span>Alamat Web Aplikasi (Shared Link Pegawai / Guru)</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                Utama
              </span>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200 font-mono text-[11px] text-slate-800 break-all">
              <span className="flex-1 select-all">{sharedAppUrl}</span>
              <button
                onClick={() => copyToClipboard(sharedAppUrl, 'shared')}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold rounded text-[11px] flex items-center gap-1 shrink-0 transition-colors shadow-xs"
              >
                {copiedKey === 'shared' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
              <a
                href={sharedAppUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-blue-700 hover:bg-blue-50 rounded shrink-0"
                title="Buka di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[10px] text-slate-500">
              * Tautan publik resmi untuk seluruh guru & staf mengakses agenda persuratan dan lembar disposisi.
            </p>
          </div>

          {/* Card 2: Development App URL */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Alamat Web Pengembangan (Development)</span>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded">
                Dev
              </span>
            </div>
            
            <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
              <span className="flex-1 select-all truncate">{devAppUrl}</span>
              <button
                onClick={() => copyToClipboard(devAppUrl, 'dev')}
                className="px-2 py-0.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-[10px] font-sans flex items-center gap-1 shrink-0"
              >
                {copiedKey === 'dev' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'dev' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Official SMAN 9 Surabaya Website */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Laman Web Resmi SMAN 9 Surabaya</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                Portal
              </span>
            </div>
            
            <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
              <span className="flex-1 select-all truncate">{officialSchoolWeb}</span>
              <button
                onClick={() => copyToClipboard(officialSchoolWeb, 'portal')}
                className="px-2 py-0.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-[10px] font-sans flex items-center gap-1 shrink-0"
              >
                {copiedKey === 'portal' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'portal' ? 'Tersalin' : 'Salin'}</span>
              </button>
              <a
                href={officialSchoolWeb}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-slate-600 hover:text-blue-600 rounded shrink-0"
                title="Kunjungi website sekolah"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 4: Direct Portal Link Surat Ijin Masuk Ujian */}
          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-amber-700" />
                <span>Link Mandiri Form Surat Ijin Masuk Ujian (Pengawas/Panitia)</span>
              </div>
              <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-1.5 py-0.5 rounded">
                Ujian
              </span>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-amber-200 font-mono text-[11px] text-slate-700 break-all">
              <span className="flex-1 select-all truncate">{`${currentOrigin}/?view=izin-ujian`}</span>
              <button
                onClick={() => copyToClipboard(`${currentOrigin}/?view=izin-ujian`, 'izin-ujian')}
                className="px-2 py-0.5 border border-amber-300 hover:bg-amber-100 text-amber-950 rounded text-[10px] font-sans font-semibold flex items-center gap-1 shrink-0"
              >
                {copiedKey === 'izin-ujian' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'izin-ujian' ? 'Tersalin' : 'Salin'}</span>
              </button>
              <a
                href={`${currentOrigin}/?view=izin-ujian`}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-amber-800 hover:bg-amber-100 rounded shrink-0"
                title="Buka link form ijin ujian di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[10px] text-amber-900">
              * Langsung membuka Form Input + Preview Cetak Bersebelahan serta cetak Blanko Kosong (6 Suket/Halaman).
            </p>
          </div>

          {/* Card 5: Direct Portal Link Struktur Organisasi */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-slate-700" />
                <span>Tautan Bagan Struktur Organisasi Sekolah</span>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-800 font-semibold px-1.5 py-0.5 rounded">
                Bagan
              </span>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
              <span className="flex-1 select-all truncate">{`${currentOrigin}/?view=struktur-organisasi`}</span>
              <button
                onClick={() => copyToClipboard(`${currentOrigin}/?view=struktur-organisasi`, 'struktur-org')}
                className="px-2 py-0.5 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded text-[10px] font-sans font-semibold flex items-center gap-1 shrink-0"
              >
                {copiedKey === 'struktur-org' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'struktur-org' ? 'Tersalin' : 'Salin'}</span>
              </button>
              <a
                href={`${currentOrigin}/?view=struktur-organisasi`}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-slate-700 hover:bg-slate-100 rounded shrink-0"
                title="Buka bagan struktur organisasi di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Instant QR Verification Preview Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue-700 shrink-0" />
            <div className="text-[11px] text-slate-800">
              <span className="font-bold">Dukungan Akses Perangkat Mobile:</span>
              <p className="text-slate-600 mt-0.5">
                Alamat web aplikasi &amp; link mandiri pengawas dapat dibuka langsung di HP, tablet, atau laptop tanpa instalasi tambahan.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            NPSN: {profile.npsn} · SMAN 9 Surabaya
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
