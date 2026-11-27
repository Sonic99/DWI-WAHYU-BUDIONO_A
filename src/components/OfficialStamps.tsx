import React from 'react';
import { resolveDirectImageUrl } from './ExamCardBarcode';

/**
 * URL berkas lokal logo resmi Pemerintah Provinsi Jawa Timur (Wikimedia Commons)
 */
export const PEMPROV_JATIM_OFFICIAL_LOGO_URL = '/logo-pemprov-jatim.png';

/**
 * Lambang Resmi Pemerintah Provinsi Jawa Timur ("Jer Basuki Mawa Beya")
 * Menggunakan berkas PNG resmi Pemprov Jatim (public/logo-pemprov-jatim.png) atau kustom upload/link web dengan fallback SVG.
 */
export const PemprovJatimLogo: React.FC<{ className?: string; customUrl?: string }> = ({
  className = 'w-16 h-16',
  customUrl
}) => {
  const resolvedUrl = resolveDirectImageUrl(customUrl) || PEMPROV_JATIM_OFFICIAL_LOGO_URL;
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [resolvedUrl]);

  if (!imgFailed) {
    return (
      <img
        src={resolvedUrl}
        alt="Logo Pemerintah Provinsi Jawa Timur"
        onError={() => setImgFailed(true)}
        className={`${className} object-contain select-none`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 120 132"
      className={className}
      aria-label="Logo Pemerintah Provinsi Jawa Timur"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M60 6 L104 16 C106 62 96 96 60 118 C24 96 14 62 16 16 Z"
        fill="#0369A1"
        stroke="#1E293B"
        strokeWidth="2.5"
      />
      <polygon
        points="60,15 62.6,22.2 70.2,22.2 64.1,26.6 66.4,33.8 60,29.5 53.6,33.8 55.9,26.6 49.8,22.2 57.4,22.2"
        fill="#FACC15"
      />
      <text x="60" y="121" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="800" fontFamily="sans-serif">
        JAWA TIMUR
      </text>
    </svg>
  );
};

/**
 * Stempel Resmi SMA Negeri 9 Surabaya (Dinas Pendidikan Pemprov Jatim)
 * Dirender sebagai vektor transparan tinta ungu-biru kedinasan.
 */
export const SchoolStampSvg: React.FC<{
  schoolName?: string;
  provinceName?: string;
  className?: string;
}> = ({
  schoolName = 'SMA NEGERI 9',
  provinceName = 'PEMERINTAH PROV. JAWA TIMUR',
  className = 'w-20 h-20'
}) => {
  const shortSchool = schoolName.toUpperCase().replace('SURABAYA', '').trim() || 'SMA NEGERI 9';
  return (
    <svg
      viewBox="0 0 140 140"
      className={className}
      aria-label="Stempel Resmi SMA Negeri 9 Surabaya"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <path id="topArc" d="M 22,70 A 48,48 0 1,1 118,70" />
        <path id="bottomArc" d="M 118,72 A 48,48 0 1,1 22,72" />
      </defs>
      <g fill="none" stroke="#4338CA" opacity="0.82">
        {/* Lingkaran Luar & Dalam */}
        <circle cx="70" cy="70" r="63" strokeWidth="3.2" />
        <circle cx="70" cy="70" r="59" strokeWidth="1" />
        <circle cx="70" cy="70" r="39" strokeWidth="1.6" />
        {/* Garis Horizontal Pengapit Tengah */}
        <line x1="32" y1="59" x2="108" y2="59" strokeWidth="1.2" />
        <line x1="32" y1="82" x2="108" y2="82" strokeWidth="1.2" />
      </g>

      {/* Teks Melingkar Atas */}
      <text fill="#4338CA" opacity="0.85" fontSize="7.4" fontWeight="800" letterSpacing="0.9" fontFamily="sans-serif">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          {provinceName.slice(0, 28)}
        </textPath>
      </text>

      {/* Teks Melingkar Bawah */}
      <text fill="#4338CA" opacity="0.85" fontSize="8" fontWeight="800" letterSpacing="1.2" fontFamily="sans-serif">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
          DINAS PENDIDIKAN
        </textPath>
      </text>

      {/* Bintang Pemisah Kiri & Kanan */}
      <text x="20" y="74" textAnchor="middle" fill="#4338CA" opacity="0.85" fontSize="9">★</text>
      <text x="120" y="74" textAnchor="middle" fill="#4338CA" opacity="0.85" fontSize="9">★</text>

      {/* Teks Tengah Instansi */}
      <text x="70" y="68" textAnchor="middle" fill="#4338CA" opacity="0.88" fontSize="8.8" fontWeight="900" fontFamily="sans-serif">
        {shortSchool}
      </text>
      <text x="70" y="78.5" textAnchor="middle" fill="#4338CA" opacity="0.88" fontSize="8.8" fontWeight="900" fontFamily="sans-serif">
        SURABAYA
      </text>
    </svg>
  );
};

/**
 * Tanda Tangan Digital Kaligrafi Kepala Sekolah (Tinta Biru Tua Kedinasan)
 */
export const KepalaSekolahSignatureSvg: React.FC<{ className?: string }> = ({
  className = 'w-24 h-10'
}) => (
  <svg
    viewBox="0 0 180 70"
    className={className}
    aria-label="Tanda Tangan Kepala Sekolah"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 52 C26 18, 44 10, 40 42 C37 56, 52 24, 66 28 C76 30, 62 50, 78 44 C92 38, 102 22, 114 32 C122 38, 108 50, 126 42 C138 36, 150 28, 164 34"
      fill="none"
      stroke="#1E3A8A"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M28 56 C62 50, 115 49, 158 53"
      fill="none"
      stroke="#1E3A8A"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M52 20 C68 12, 84 14, 96 20"
      fill="none"
      stroke="#1E3A8A"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

/**
 * URL berkas lokal logo resmi SMA Negeri 9 Surabaya (SMANIX) dari Wikimedia Commons (Logo_SMANIX.png)
 */
export const SMAN9_OFFICIAL_LOGO_URL = '/logo-sman9.png';

/**
 * Lambang Resmi SMA Negeri 9 Surabaya (SMANIX)
 * Menggunakan berkas PNG resmi SMA Negeri 9 Surabaya (public/logo-sman9.png) atau kustom upload/link web dengan fallback SVG aman.
 */
export const Sman9SurabayaLogoSvg: React.FC<{
  className?: string;
  monochrome?: boolean;
  customUrl?: string;
}> = ({ className = 'w-32 h-32', monochrome = false, customUrl }) => {
  const resolvedUrl = resolveDirectImageUrl(customUrl) || SMAN9_OFFICIAL_LOGO_URL;
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [resolvedUrl]);

  if (!imgFailed) {
    return (
      <img
        src={resolvedUrl}
        alt="Logo Resmi SMA Negeri 9 Surabaya"
        onError={() => setImgFailed(true)}
        className={`${className} object-contain select-none ${
          monochrome ? 'grayscale contrast-125' : ''
        }`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      aria-label="Logo Resmi SMA Negeri 9 Surabaya"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100 14 L172 40 L166 122 C162 162 134 192 100 208 C66 192 38 162 34 122 L28 40 Z"
        fill="#1E3A8A"
        stroke="#D97706"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fill="#FACC15"
        fontSize="42"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        9
      </text>
      <text
        x="100"
        y="165"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="14"
        fontWeight="800"
        fontFamily="sans-serif"
      >
        SMAN 9 SBY
      </text>
    </svg>
  );
};

/**
 * Background Halaman Air (Watermark) Transparan Terpadu:
 * Tulisan bergelombang "SMA NEGERI 9 SURABAYA" dengan kerapatan baris & jarak kata yang dapat diatur,
 * garis gelombang halus, serta Logo Resmi SMA Negeri 9 Surabaya di bagian tengah.
 */
export const Sman9WavyWatermarkBg: React.FC<{
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'F4';
  opacityPct?: number;
  waveRowGapPx?: number;
  waveWordGapPx?: number;
  customLogoUrl?: string;
  sekolahLogoUrl?: string;
  useCustomLogo?: boolean;
}> = ({
  orientation = 'portrait',
  paperSize = 'A4',
  opacityPct = 12,
  waveRowGapPx = 54,
  waveWordGapPx = 22,
  customLogoUrl,
  sekolahLogoUrl,
  useCustomLogo = false
}) => {
  const uid = React.useId().replace(/:/g, '');
  const isLandscape = orientation === 'landscape';
  const vbW = isLandscape ? 1120 : 800;
  const vbH = isLandscape ? 800 : 1120;

  const clampedRowGap = Math.max(28, Math.min(130, waveRowGapPx));
  const clampedWordGap = Math.max(4, Math.min(80, waveWordGapPx));
  const gapHalf = Math.round(clampedWordGap * 0.5);
  const waveAmp = Math.min(28, Math.max(10, Math.round(clampedRowGap * 0.34)));

  // Bangkitkan koordinat baris gelombang secara seragam agar seluruh sudut halaman terisi penuh tanpa tabrakan
  const waveRows = React.useMemo(() => {
    const rows: number[] = [];
    for (let y = -130; y <= vbH + 150; y += clampedRowGap) {
      rows.push(y);
    }
    return rows;
  }, [vbH, clampedRowGap]);

  const logoSizeClass = isLandscape
    ? 'w-[104mm] h-[104mm]'
    : paperSize === 'F4'
      ? 'w-[130mm] h-[130mm]'
      : 'w-[120mm] h-[120mm]';

  // Lebar segmen gelombang & panjang kurva melebihi batas viewBox kiri/kanan agar stager teks mulus
  const xStart = -360;
  const seg = 260;
  const segCount = Math.ceil((vbW + 760) / seg);
  const fontSize = clampedRowGap <= 40 ? 11.5 : clampedRowGap <= 62 ? 12.5 : 13.5;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 z-0 overflow-hidden"
      style={{ opacity: Math.max(0.03, Math.min(0.4, opacityPct / 100)) }}
    >
      {/* Lapisan Pola Tulisan Bergelombang "SMA NEGERI 9 SURABAYA" */}
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {waveRows.map((yBase, idx) => {
            let d = `M ${xStart},${yBase} Q ${xStart + seg / 2},${yBase - waveAmp} ${xStart + seg},${yBase}`;
            for (let s = 2; s <= segCount; s++) {
              d += ` T ${xStart + seg * s},${yBase}`;
            }
            return <path key={idx} id={`sman9Wave-${uid}-${idx}`} d={d} />;
          })}
        </defs>

        <g transform={`rotate(-11 ${vbW / 2} ${vbH / 2})`}>
          {waveRows.map((yBase, idx) => {
            const pathId = `sman9Wave-${uid}-${idx}`;
            const startOffsetPct = `${(idx % 3) * 4 + 1}%`;
            let guideD = `M ${xStart},${yBase + 8} Q ${xStart + seg / 2},${yBase + 8 - waveAmp} ${xStart + seg},${yBase + 8}`;
            for (let s = 2; s <= segCount; s++) {
              guideD += ` T ${xStart + seg * s},${yBase + 8}`;
            }
            return (
              <g key={idx}>
                <use
                  href={`#${pathId}`}
                  fill="none"
                  stroke="#1E3A8A"
                  strokeWidth="0.6"
                  opacity="0.28"
                />
                <text
                  fill="#1E3A8A"
                  fontSize={fontSize}
                  fontWeight="800"
                  letterSpacing={clampedWordGap < 16 ? '1.6' : '2.4'}
                  fontFamily="sans-serif"
                  opacity="0.64"
                >
                  <textPath href={`#${pathId}`} startOffset={startOffsetPct}>
                    {Array.from({ length: 12 }).map((_, rIdx) => (
                      <React.Fragment key={rIdx}>
                        <tspan dx={rIdx === 0 ? 0 : gapHalf}>SMA NEGERI 9 SURABAYA</tspan>
                        <tspan dx={gapHalf}>•</tspan>
                      </React.Fragment>
                    ))}
                  </textPath>
                </text>
                {/* Garis gelombang pengapit halus */}
                <path
                  d={guideD}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="0.45"
                  opacity="0.24"
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Lapisan Tengah: Logo Resmi SMAN 9 Surabaya */}
      <div className="absolute inset-0 flex items-center justify-center">
        {useCustomLogo && customLogoUrl ? (
          <img
            src={resolveDirectImageUrl(customLogoUrl)}
            alt=""
            className={`${logoSizeClass} object-contain grayscale-[20%] opacity-90`}
          />
        ) : (
          <Sman9SurabayaLogoSvg customUrl={sekolahLogoUrl} className={`${logoSizeClass} opacity-90`} />
        )}
      </div>
    </div>
  );
};


