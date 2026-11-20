import React from 'react';
import { SchoolProfile } from '../types';
import { PemprovJatimLogo } from './OfficialStamps';

interface OfficialKopSuratProps {
  profile: SchoolProfile;
  compact?: boolean;
}

export const OfficialKopSurat: React.FC<OfficialKopSuratProps> = ({ profile, compact = false }) => {
  const cleanWebsite = (profile.website || 'sman9sby.sch.id')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  const faxText = profile.faksimili || '(031) 5477817';
  const isCustomLogo = profile.logoType === 'custom' && !!profile.logoUrl;
  const isDefaultShield = profile.logoType === 'default' || profile.logoType === 'default_vector';

  return (
    <div className={`w-full text-center select-none ${compact ? 'pb-2 mb-3' : 'pb-3 mb-5'}`}>
      <div className="flex items-center justify-between gap-3 sm:gap-5">
        {/* Logo Resmi Pemprov Jawa Timur di Sebelah Kiri (atau Logo Kustom jika diunggah) */}
        <div
          className={`${
            compact ? 'w-14 h-14' : 'w-20 h-20'
          } shrink-0 flex items-center justify-center overflow-hidden`}
        >
          {isCustomLogo || (profile.logoUrl && !profile.logoUrl.includes('Lambang_Provinsi_Jawa_Timur')) ? (
            <img
              src={profile.logoUrl}
              alt={profile.namaSekolah}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : isDefaultShield ? (
            <svg viewBox="0 0 100 100" className={compact ? 'w-12 h-12' : 'w-16 h-16'} aria-label="Logo SMAN 9 Surabaya">
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E3A8A" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              <path d="M50 5 L88 20 L88 55 C88 78 50 95 50 95 C50 95 12 78 12 55 L12 20 Z" fill="url(#shieldGrad)" stroke="#D97706" strokeWidth="3" />
              <path d="M30 45 C40 40 50 48 50 58 C50 48 60 40 70 45 C60 55 50 62 50 72 C50 62 40 55 30 45 Z" fill="#FFFFFF" opacity="0.95" />
              <circle cx="50" cy="38" r="12" fill="url(#goldGrad)" stroke="#FFFFFF" strokeWidth="1.5" />
              <text x="50" y="43" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="bold" fontFamily="sans-serif">9</text>
              <polygon points="50,15 52,21 58,21 53,25 55,31 50,27 45,31 47,25 42,21 48,21" fill="#FBBF24" />
            </svg>
          ) : (
            <PemprovJatimLogo className={compact ? 'w-13 h-14' : 'w-18 h-20'} />
          )}
        </div>

        {/* Header Teks Kedinasan Resmi Pemprov Jatim */}
        <div className="flex-1 text-center text-black leading-snug">
          <h4 className={`${compact ? 'text-[11px]' : 'text-[13px]'} tracking-wide uppercase font-semibold text-slate-900`}>
            PEMERINTAH PROVINSI JAWA TIMUR
          </h4>
          <h3 className={`${compact ? 'text-xs' : 'text-[15px]'} tracking-wide uppercase font-bold text-slate-950`}>
            DINAS PENDIDIKAN
          </h3>
          <h2 className={`font-black tracking-tight text-black uppercase ${compact ? 'text-base' : 'text-[22px] leading-tight'}`}>
            {profile.namaSekolah}
          </h2>
          <p className={`${compact ? 'text-[10px]' : 'text-[11.5px]'} text-slate-900 leading-tight mt-0.5`}>
            {profile.alamat}, {profile.kota}, {profile.provinsi} {profile.kodePos}
          </p>
          <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-slate-900 leading-tight mt-0.5`}>
            Telepon {profile.telepon} - Faksimili {faxText}
          </p>
          <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-slate-900 leading-tight mt-0.5`}>
            Laman <span className="font-medium">{cleanWebsite}</span>
            {'  '}Pos-el <span className="font-medium">{profile.email}</span>
          </p>
        </div>

        {/* Penyeimbang lebar agar teks benar-benar simetris di tengah kertas */}
        <div className={`${compact ? 'w-10' : 'w-14 sm:w-16'} shrink-0`} aria-hidden="true" />
      </div>

      {/* Garis Tebal Ganda Resmi Kop Surat Kedinasan */}
      <div className="mt-2.5 border-b-[3px] border-black"></div>
      <div className="mt-0.5 border-b border-black"></div>
    </div>
  );
};
