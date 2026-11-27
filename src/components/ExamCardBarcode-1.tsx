import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import { Siswa } from '../types';

/**
 * Mengonversi URL umum maupun tautan berbagi Google Drive agar bisa langsung tampil di <img>
 */
export const resolveDirectImageUrl = (rawUrl?: string): string => {
  const url = (rawUrl || '').trim();
  if (!url) return '';
  if (url.startsWith('data:image/')) return url;

  // Google Drive: https://drive.google.com/file/d/<ID>/view...
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w400`;
  }

  // Google Drive: https://drive.google.com/open?id=<ID> or uc?id=<ID>
  const idMatch = url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([a-zA-Z0-9_-]+)/);
  if (idMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w400`;
  }

  return url;
};

/**
 * Mengisi placeholder pola link foto / barcode per siswa
 * Placeholder didukung: {nisn}, {nis}, {nipd}, {nomorUjian}, {kelas}, {ruang}, {sesi}, {nama}
 */
export const resolveStudentTemplateUrl = (template: string, siswa: Siswa): string => {
  const raw = (template || '').trim();
  if (!raw) return '';

  const kelas = siswa.rombelSaatIni || siswa.kelas || '';
  const nis = siswa.nis || siswa.nipd || '';
  const nipd = siswa.nipd || siswa.nis || '';

  return raw
    .replace(/\{nisn\}/gi, encodeURIComponent(siswa.nisn || ''))
    .replace(/\{nis\}/gi, encodeURIComponent(nis))
    .replace(/\{nipd\}/gi, encodeURIComponent(nipd))
    .replace(/\{nomorUjian\}/gi, encodeURIComponent(siswa.nomorUjian || ''))
    .replace(/\{kelas\}/gi, encodeURIComponent(kelas))
    .replace(/\{ruang\}/gi, encodeURIComponent(siswa.ruangUjian || ''))
    .replace(/\{sesi\}/gi, encodeURIComponent(siswa.sesiUjian || ''))
    .replace(/\{nama\}/gi, encodeURIComponent(siswa.nama || ''));
};

// Code 39 encoding table for crisp 1D linear barcodes
const CODE39_MAP: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn'
};

interface ExamCardBarcodeProps {
  value: string;
  mode: 'qr_link' | 'barcode_1d' | 'gambar_url';
  size?: number;
  className?: string;
}

export const ExamCardBarcode: React.FC<ExamCardBarcodeProps> = ({
  value,
  mode,
  size = 44,
  className = ''
}) => {
  const safeValue = (value || '').trim() || 'SMAN9SBY';

  const qrSvg = useMemo(() => {
    if (mode !== 'qr_link') return null;
    try {
      const qr = QRCode.create(safeValue, { errorCorrectionLevel: 'M' });
      const modules = qr.modules;
      const count = modules.size;
      const rects: string[] = [];
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (modules.get(r, c)) {
            rects.push(`M${c},${r}h1v1h-1z`);
          }
        }
      }
      return {
        viewBox: `0 0 ${count} ${count}`,
        path: rects.join('')
      };
    } catch {
      return null;
    }
  }, [safeValue, mode]);

  const barcode1d = useMemo(() => {
    if (mode !== 'barcode_1d') return null;
    // Extract clean Code-39 payload (max 18 chars so bars stay sharp on card)
    const cleaned = safeValue
      .replace(/^https?:\/\/[^/]+\/?/i, '')
      .toUpperCase()
      .split('')
      .map(ch => (CODE39_MAP[ch] ? ch : '-'))
      .join('')
      .slice(0, 18);
    const full = `*${cleaned || 'SMAN9'}*`;
    let x = 0;
    const bars: { x: number; w: number }[] = [];
    for (let i = 0; i < full.length; i++) {
      const pattern = CODE39_MAP[full[i]] || CODE39_MAP['-'];
      for (let j = 0; j < pattern.length; j++) {
        const w = pattern[j] === 'w' ? 3 : 1;
        if (j % 2 === 0) {
          bars.push({ x, w });
        }
        x += w;
      }
      x += 1; // inter-character narrow gap
    }
    return { totalWidth: Math.max(10, x), bars };
  }, [safeValue, mode]);

  if (mode === 'gambar_url') {
    const imgSrc = resolveDirectImageUrl(value);
    if (!imgSrc) {
      return (
        <div
          style={{ width: size, height: size }}
          className={`border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[6px] text-slate-400 text-center p-0.5 ${className}`}
        >
          Link Barcode
        </div>
      );
    }
    return (
      <img
        src={imgSrc}
        alt="Barcode Peserta"
        style={{ width: size, height: size }}
        className={`object-contain bg-white border border-slate-200 ${className}`}
      />
    );
  }

  if (mode === 'barcode_1d' && barcode1d) {
    return (
      <div className={`bg-white border border-slate-300 px-1 py-0.5 inline-flex flex-col items-center ${className}`}>
        <svg
          viewBox={`0 0 ${barcode1d.totalWidth} 24`}
          style={{ width: Math.max(76, size * 1.9), height: Math.max(22, Math.round(size * 0.48)) }}
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          aria-label="Barcode Peserta"
        >
          {barcode1d.bars.map((bar, idx) => (
            <rect key={idx} x={bar.x} y={0} width={bar.w} height={24} fill="#0f172a" />
          ))}
        </svg>
        <span className="text-[6.5px] font-mono text-slate-700 leading-none mt-0.5 truncate max-w-[96px]">
          {safeValue.replace(/^https?:\/\//i, '').slice(0, 22)}
        </span>
      </div>
    );
  }

  if (!qrSvg) return null;

  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-white p-0.5 border border-slate-300 shrink-0 ${className}`}
      title={safeValue}
    >
      <svg
        viewBox={qrSvg.viewBox}
        className="w-full h-full"
        shapeRendering="crispEdges"
        aria-label="QR Code Verifikasi Kartu Ujian"
      >
        <rect width="100%" height="100%" fill="#ffffff" />
        <path d={qrSvg.path} fill="#0f172a" />
      </svg>
    </div>
  );
};
