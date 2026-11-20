import React from 'react';

interface OfficialQrStampProps {
  code: string;
  label?: string;
  verifier?: string;
  size?: number;
}

export const OfficialQrStamp: React.FC<OfficialQrStampProps> = ({
  code,
  label = 'TTE Terverifikasi',
  verifier = 'Dr. Kasminah, M.Pd.',
  size = 72
}) => {
  // Deterministic pattern generator based on code
  const hash = code.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);
  
  return (
    <div className="inline-flex items-center gap-3 border border-slate-300 rounded p-1.5 bg-white select-none">
      <div 
        style={{ width: size, height: size }} 
        className="bg-slate-900 p-1 flex items-center justify-center shrink-0 rounded-xs"
      >
        <svg viewBox="0 0 33 33" className="w-full h-full fill-white" shapeRendering="crispEdges">
          {/* QR Corner 1 */}
          <rect x="2" y="2" width="7" height="7" fill="white" />
          <rect x="3" y="3" width="5" height="5" fill="#0f172a" />
          <rect x="4" y="4" width="3" height="3" fill="white" />

          {/* QR Corner 2 */}
          <rect x="24" y="2" width="7" height="7" fill="white" />
          <rect x="25" y="3" width="5" height="5" fill="#0f172a" />
          <rect x="26" y="4" width="3" height="3" fill="white" />

          {/* QR Corner 3 */}
          <rect x="2" y="24" width="7" height="7" fill="white" />
          <rect x="3" y="25" width="5" height="5" fill="#0f172a" />
          <rect x="4" y="26" width="3" height="3" fill="white" />

          {/* QR Data Matrix Bits */}
          <rect x="11" y="4" width="2" height="2" fill="white" />
          <rect x="15" y="4" width="2" height="2" fill="white" />
          <rect x="19" y="4" width="2" height="2" fill="white" />

          <rect x="4" y="11" width="2" height="2" fill="white" />
          <rect x="8" y="11" width="2" height="2" fill="white" />
          <rect x="12" y="12" width="3" height="3" fill="white" />
          <rect x="17" y="11" width="2" height="2" fill="white" />
          <rect x="21" y="11" width="2" height="2" fill="white" />
          <rect x="27" y="12" width="2" height="2" fill="white" />

          <rect x="11" y="16" width="4" height="2" fill="white" />
          <rect x="18" y="16" width="3" height="3" fill="white" />
          <rect x="24" y="17" width="2" height="2" fill="white" />

          <rect x="4" y="19" width="3" height="2" fill="white" />
          <rect x="14" y="21" width="2" height="3" fill="white" />
          <rect x="20" y="22" width="2" height="2" fill="white" />
          <rect x="26" y="22" width="3" height="2" fill="white" />

          <rect x="11" y="26" width="3" height="3" fill="white" />
          <rect x="16" y="27" width="2" height="2" fill="white" />
          <rect x="21" y="26" width="3" height="2" fill="white" />
          <rect x="27" y="27" width="2" height="2" fill="white" />
        </svg>
      </div>

      <div className="text-left text-[10px] leading-tight text-slate-700">
        <p className="font-bold uppercase tracking-wider text-blue-950 text-[9px]">
          {label}
        </p>
        <p className="font-mono text-slate-800 text-[10px] truncate max-w-[140px] font-semibold mt-0.5">
          {code}
        </p>
        <p className="text-slate-600 text-[9px] mt-0.5">
          Otorisasi: {verifier}
        </p>
        <p className="text-[8px] text-slate-500 font-mono mt-0.5">
          SIP-TU SMANIX · ID #{hash}
        </p>
      </div>
    </div>
  );
};
