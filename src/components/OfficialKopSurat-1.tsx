import React from 'react';
import { SchoolProfile } from '../types';
import { PemprovJatimLogo, Sman9SurabayaLogoSvg } from './OfficialStamps';
import { resolveDirectImageUrl } from './ExamCardBarcode';

interface OfficialKopSuratProps {
  profile: SchoolProfile;
  compact?: boolean;
  /** Mode sangat ringkas (isi sama, tinggi minimal) untuk halaman yang butuh ruang vertikal, mis. bagan struktur. */
  dense?: boolean;
}

export const OfficialKopSurat: React.FC<OfficialKopSuratProps> = ({
  profile,
  compact = false,
  dense = false
}) => {
  const cleanWebsite = (profile.website || 'sman9sby.sch.id')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  const faxText = profile.faksimili || '(031) 5477817';
  const isCustomLogo = profile.logoType === 'custom' && !!profile.logoUrl;
  const isDefaultShield = profile.logoType === 'default' || profile.logoType === 'default_vector';
  const customLogoSrc = resolveDirectImageUrl(profile.logoUrl);

  if (dense) {
    return (
      <div className="w-full text-center select-none pb-1 mb-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="w-14 h-14 shrink-0 flex items-center justify-center overflow-hidden">
            {isCustomLogo || (customLogoSrc && !customLogoSrc.includes('Lambang_Provinsi_Jawa_Timur')) ? (
              <img
                src={customLogoSrc}
                alt={profile.namaSekolah}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : isDefaultShield ? (
              <Sman9SurabayaLogoSvg customUrl={profile.sekolahLogoUrl} className="w-12 h-14" />
            ) : (
              <PemprovJatimLogo customUrl={profile.pemprovLogoUrl} className="w-12 h-14" />
            )}
          </div>
          <div className="flex-1 text-center text-black leading-tight">
            <div className="text-[11px] tracking-wide uppercase font-semibold text-slate-900">
              PEMERINTAH PROVINSI JAWA TIMUR · DINAS PENDIDIKAN
            </div>
            <div className="text-[17px] font-black tracking-tight text-black uppercase leading-tight">
              {profile.namaSekolah}
            </div>
            <div className="text-[10px] text-slate-900">
              {profile.alamat}, {profile.kota}, {profile.provinsi} {profile.kodePos} · Telepon{' '}
              {profile.telepon} · Faksimili {faxText}
            </div>
            <div className="text-[10px] text-slate-900">
              Laman <span className="font-medium">{cleanWebsite}</span> · Pos-el{' '}
              <span className="font-medium">{profile.email}</span>
            </div>
          </div>
          <div className="w-14 shrink-0" aria-hidden="true" />
        </div>
        <div className="mt-1 border-b-[2.5px] border-black"></div>
        <div className="mt-px border-b border-black"></div>
      </div>
    );
  }

  return (
    <div className={`w-full text-center select-none ${compact ? 'pb-2 mb-3' : 'pb-3 mb-5'}`}>
      <div className="flex items-center justify-between gap-3 sm:gap-5">
        {/* Logo Resmi Pemprov Jawa Timur atau Logo Resmi SMAN 9 Surabaya (posisi tetap di sebelah kiri) */}
        <div
          className={`${
            compact ? 'w-16 h-18' : 'w-22 h-24'
          } shrink-0 flex items-center justify-center overflow-hidden`}
        >
          {isCustomLogo || (customLogoSrc && !customLogoSrc.includes('Lambang_Provinsi_Jawa_Timur')) ? (
            <img
              src={customLogoSrc}
              alt={profile.namaSekolah}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : isDefaultShield ? (
            <Sman9SurabayaLogoSvg customUrl={profile.sekolahLogoUrl} className={compact ? 'w-15 h-17' : 'w-20 h-22'} />
          ) : (
            <PemprovJatimLogo customUrl={profile.pemprovLogoUrl} className={compact ? 'w-15 h-17' : 'w-20 h-22'} />
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
        <div className={`${compact ? 'w-12 sm:w-14' : 'w-16 sm:w-20'} shrink-0`} aria-hidden="true" />
      </div>

      {/* Garis Tebal Ganda Resmi Kop Surat Kedinasan */}
      <div className="mt-2.5 border-b-[3px] border-black"></div>
      <div className="mt-0.5 border-b border-black"></div>
    </div>
  );
};
