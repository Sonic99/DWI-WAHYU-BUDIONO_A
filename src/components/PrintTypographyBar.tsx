import React from 'react';
import { Type, AlignJustify, ZoomIn, ZoomOut } from 'lucide-react';
import {
  PRINT_FONT_OPTIONS,
  PRINT_LINE_SPACING_OPTIONS,
  PrintFontKey,
  PrintLineSpacing,
  PrintTypographySettings
} from '../utils/printTypography';

interface PrintTypographyBarProps {
  value: PrintTypographySettings;
  onChange: (next: PrintTypographySettings) => void;
  previewZoomPct?: number;
  onPreviewZoomChange?: (nextPct: number) => void;
  zoomPresets?: number[];
  fontScaleOptions?: number[];
  darkSurface?: boolean;
  compact?: boolean;
}

export const PrintTypographyBar: React.FC<PrintTypographyBarProps> = ({
  value,
  onChange,
  previewZoomPct,
  onPreviewZoomChange,
  zoomPresets = [50, 65, 85, 100],
  fontScaleOptions = [90, 100, 110, 120],
  darkSurface = false,
  compact = false
}) => {
  const wrapperCls = darkSurface
    ? 'inline-flex flex-wrap items-center gap-2 text-xs text-slate-200'
    : 'inline-flex flex-wrap items-center gap-2 text-xs text-slate-700';

  const pillGroupCls = darkSurface
    ? 'inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5'
    : 'inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5';

  const selectCls = darkSurface
    ? 'px-2 py-1 border border-slate-700 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400'
    : 'px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500';

  const activePillCls = darkSurface
    ? 'bg-blue-600 text-white shadow-2xs'
    : 'bg-white text-slate-900 shadow-2xs';

  const inactivePillCls = darkSurface
    ? 'text-slate-300 hover:text-white'
    : 'text-slate-600 hover:text-slate-900';

  return (
    <div className={wrapperCls}>
      {/* Font Selector */}
      <label className="inline-flex items-center gap-1" title="Jenis Font Lembar Cetak">
        <Type className={`w-3.5 h-3.5 shrink-0 ${darkSurface ? 'text-slate-400' : 'text-slate-500'}`} />
        {!compact && (
          <span className={`text-[11px] font-semibold whitespace-nowrap ${darkSurface ? 'text-slate-300' : 'text-slate-600'}`}>
            Font:
          </span>
        )}
        <select
          value={value.fontFamily}
          onChange={e => onChange({ ...value, fontFamily: e.target.value as PrintFontKey })}
          className={selectCls}
          aria-label="Jenis Font Cetak"
        >
          {PRINT_FONT_OPTIONS.map(f => (
            <option key={f.id} value={f.id}>
              {compact ? f.shortLabel : f.label}
            </option>
          ))}
        </select>
      </label>

      {/* Jarak Spasi Baris & Tabel */}
      <div className="inline-flex items-center gap-1" title="Jarak Spasi Baris & Proporsi Laporan">
        <AlignJustify className={`w-3.5 h-3.5 shrink-0 ${darkSurface ? 'text-slate-400' : 'text-slate-500'}`} />
        {!compact && (
          <span className={`text-[11px] font-semibold whitespace-nowrap ${darkSurface ? 'text-slate-300' : 'text-slate-600'}`}>
            Spasi:
          </span>
        )}
        <div className={pillGroupCls}>
          {(['padat', 'nyaman', 'lega'] as PrintLineSpacing[]).map(spKey => {
            const meta = PRINT_LINE_SPACING_OPTIONS[spKey];
            const active = value.lineSpacing === spKey;
            return (
              <button
                key={spKey}
                type="button"
                onClick={() => onChange({ ...value, lineSpacing: spKey })}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active ? activePillCls : inactivePillCls
                }`}
              >
                {meta.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skala Huruf */}
      <select
        value={value.fontScalePct}
        onChange={e => onChange({ ...value, fontScalePct: Number(e.target.value) })}
        className={`${selectCls} tabular-nums`}
        title="Ukuran / Skala Teks Konten"
        aria-label="Skala Huruf Konten"
      >
        {fontScaleOptions.map(pct => (
          <option key={pct} value={pct}>
            Teks {pct}%
          </option>
        ))}
      </select>

      {/* Optional Preview Zoom */}
      {typeof previewZoomPct === 'number' && onPreviewZoomChange && (
        <div className={`${pillGroupCls} gap-0.5 px-1 tabular-nums`}>
          <button
            type="button"
            onClick={() => onPreviewZoomChange(Math.max(40, previewZoomPct - 10))}
            className={`p-1 rounded ${darkSurface ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'}`}
            title="Perkecil Pratinjau"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoomPresets.map(zp => (
            <button
              key={zp}
              type="button"
              onClick={() => onPreviewZoomChange(zp)}
              className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                Math.abs(previewZoomPct - zp) <= 3 ? activePillCls : inactivePillCls
              }`}
            >
              {zp}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPreviewZoomChange(Math.min(125, previewZoomPct + 10))}
            className={`p-1 rounded ${darkSurface ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'}`}
            title="Perbesar Pratinjau"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
