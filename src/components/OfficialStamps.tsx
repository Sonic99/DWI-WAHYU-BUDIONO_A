import React from 'react';

/**
 * Lambang Resmi Pemerintah Provinsi Jawa Timur ("Jer Basuki Mawa Beya")
 * Dirender sebagai vektor SVG presisi tinggi agar tetap tajam saat dicetak maupun di mode luring.
 */
export const PemprovJatimLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 120 132"
    className={className}
    aria-label="Logo Pemerintah Provinsi Jawa Timur"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="jatimBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>
      <linearGradient id="jatimGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* Perisai Utama Berbingkai Emas */}
    <path
      d="M60 6 L104 16 C106 62 96 96 60 118 C24 96 14 62 16 16 Z"
      fill="url(#jatimBlue)"
      stroke="#1E293B"
      strokeWidth="2.5"
    />
    <path
      d="M60 10 L99 19 C101 60 92 92 60 112 C28 92 19 60 21 19 Z"
      fill="none"
      stroke="url(#jatimGold)"
      strokeWidth="2"
    />

    {/* Bintang Kemuliaan di Puncak */}
    <polygon
      points="60,15 62.6,22.2 70.2,22.2 64.1,26.6 66.4,33.8 60,29.5 53.6,33.8 55.9,26.6 49.8,22.2 57.4,22.2"
      fill="#FACC15"
      stroke="#78350F"
      strokeWidth="0.7"
    />

    {/* Gunung Berapi (Bromo / Semeru) */}
    <path d="M27 72 L46 47 L60 59 L76 44 L93 72 Z" fill="#15803D" stroke="#052E16" strokeWidth="1" />
    <path d="M46 47 L53 54 L48 56 L41 53 Z" fill="#94A3B8" opacity="0.55" />

    {/* Tugu Pahlawan Surabaya di Tengah */}
    <polygon
      points="60,36 62.5,68 57.5,68"
      fill="#F8FAFC"
      stroke="#334155"
      strokeWidth="0.8"
    />
    <rect x="55" y="68" width="10" height="4" rx="0.6" fill="#E2E8F0" stroke="#334155" strokeWidth="0.7" />

    {/* Gerbang Candi Bentar Kiri & Kanan */}
    <path d="M35 72 L35 58 L41 62 L41 72 Z" fill="#B45309" stroke="#451A03" strokeWidth="0.6" />
    <path d="M85 72 L85 58 L79 62 L79 72 Z" fill="#B45309" stroke="#451A03" strokeWidth="0.6" />

    {/* Sungai & Roda Gigi Pembangunan */}
    <path
      d="M28 76 Q44 72 60 76 T92 76 L88 86 Q60 95 32 86 Z"
      fill="#0284C7"
      stroke="#E0F2FE"
      strokeWidth="1"
    />
    <path d="M34 80 Q47 77 60 80 T86 80" fill="none" stroke="#BAE6FD" strokeWidth="1.2" />

    {/* Padi (Kiri) dan Kapas (Kanan) */}
    <path
      d="M29 30 C23 48 26 70 43 92"
      fill="none"
      stroke="#FACC15"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M91 30 C97 48 94 70 77 92"
      fill="none"
      stroke="#F8FAFC"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* Aksen bulir padi & kapas */}
    {[35, 44, 53, 62, 71, 80].map((y, i) => (
      <React.Fragment key={i}>
        <circle cx={26 + i * 1.4} cy={y} r="1.8" fill="#FDE047" />
        <circle cx={94 - i * 1.4} cy={y} r="2.1" fill="#FFFFFF" stroke="#16A34A" strokeWidth="0.6" />
      </React.Fragment>
    ))}

    {/* Pita "JAWA TIMUR" */}
    <path d="M37 88 Q60 95 83 88 L81 97 Q60 104 39 97 Z" fill="#DC2626" stroke="#7F1D1D" strokeWidth="0.8" />
    <text x="60" y="96" textAnchor="middle" fill="#FFFFFF" fontSize="5.8" fontWeight="800" fontFamily="sans-serif">
      JAWA TIMUR
    </text>

    {/* Pita Bawah Semboyan "JER BASUKI MAWA BEYA" */}
    <path
      d="M14 111 Q60 125 106 111 L102 123 Q60 134 18 123 Z"
      fill="#F8FAFC"
      stroke="#1E293B"
      strokeWidth="1.4"
    />
    <text x="60" y="121" textAnchor="middle" fill="#0F172A" fontSize="5.7" fontWeight="800" letterSpacing="0.4" fontFamily="sans-serif">
      JER BASUKI MAWA BEYA
    </text>
  </svg>
);

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
