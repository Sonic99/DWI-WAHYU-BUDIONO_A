import React from 'react';

export type PrintFontKey = 'inter' | 'jakarta' | 'arial' | 'times' | 'lora';
export type PrintLineSpacing = 'padat' | 'nyaman' | 'lega';

export interface PrintTypographySettings {
  fontFamily: PrintFontKey;
  lineSpacing: PrintLineSpacing;
  fontScalePct: number; // 90 | 95 | 100 | 105 | 110 | 120
}

export interface PrintFontOption {
  id: PrintFontKey;
  label: string;
  shortLabel: string;
  fontFamily: string;
}

export interface PrintLineSpacingMeta {
  id: PrintLineSpacing;
  label: string;
  shortLabel: string;
  lineHeight: number;
  cellPyPx: number;
  cellPxPx: number;
  sectionGapPx: number;
  stackGapPx: number;
  paraGapPx: number;
  scaleFactor: number;
}

export const PRINT_FONT_OPTIONS: PrintFontOption[] = [
  {
    id: 'inter',
    label: 'Inter (Modern Jelas)',
    shortLabel: 'Inter',
    fontFamily: "'Inter', 'Plus Jakarta Sans', Arial, sans-serif"
  },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    shortLabel: 'Jakarta Sans',
    fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif"
  },
  {
    id: 'arial',
    label: 'Arial / Standar Dinas',
    shortLabel: 'Arial',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },
  {
    id: 'times',
    label: 'Times New Roman (Resmi)',
    shortLabel: 'Times New Roman',
    fontFamily: "'Times New Roman', Georgia, serif"
  },
  {
    id: 'lora',
    label: 'Lora Serif (Naskah)',
    shortLabel: 'Lora Serif',
    fontFamily: "'Lora', 'Merriweather', Georgia, serif"
  }
];

export const PRINT_LINE_SPACING_OPTIONS: Record<PrintLineSpacing, PrintLineSpacingMeta> = {
  padat: {
    id: 'padat',
    label: 'Rapat (Padat)',
    shortLabel: 'Rapat',
    lineHeight: 1.24,
    cellPyPx: 3,
    cellPxPx: 5,
    sectionGapPx: 8,
    stackGapPx: 8,
    paraGapPx: 6,
    scaleFactor: 0.82
  },
  nyaman: {
    id: 'nyaman',
    label: 'Nyaman (Standar)',
    shortLabel: 'Nyaman',
    lineHeight: 1.44,
    cellPyPx: 5.5,
    cellPxPx: 7,
    sectionGapPx: 14,
    stackGapPx: 12,
    paraGapPx: 10,
    scaleFactor: 1.0
  },
  lega: {
    id: 'lega',
    label: 'Lega (Longgar)',
    shortLabel: 'Lega',
    lineHeight: 1.66,
    cellPyPx: 8.5,
    cellPxPx: 9,
    sectionGapPx: 20,
    stackGapPx: 18,
    paraGapPx: 14,
    scaleFactor: 1.26
  }
};

export const DEFAULT_PRINT_TYPOGRAPHY: PrintTypographySettings = {
  fontFamily: 'inter',
  lineSpacing: 'nyaman',
  fontScalePct: 100
};

export const resolvePrintFontOption = (key?: PrintFontKey): PrintFontOption => {
  return PRINT_FONT_OPTIONS.find(f => f.id === key) || PRINT_FONT_OPTIONS[0];
};

export const resolvePrintSpacingMeta = (
  spacing?: PrintLineSpacing
): PrintLineSpacingMeta => {
  return PRINT_LINE_SPACING_OPTIONS[spacing || 'nyaman'] || PRINT_LINE_SPACING_OPTIONS.nyaman;
};

export const getStoredPrintTypography = (
  storageKey: string,
  fallback: Partial<PrintTypographySettings> = {}
): PrintTypographySettings => {
  const base: PrintTypographySettings = {
    ...DEFAULT_PRINT_TYPOGRAPHY,
    ...fallback
  };
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<PrintTypographySettings>;
    return {
      fontFamily: PRINT_FONT_OPTIONS.some(f => f.id === parsed.fontFamily)
        ? (parsed.fontFamily as PrintFontKey)
        : base.fontFamily,
      lineSpacing:
        parsed.lineSpacing && parsed.lineSpacing in PRINT_LINE_SPACING_OPTIONS
          ? (parsed.lineSpacing as PrintLineSpacing)
          : base.lineSpacing,
      fontScalePct:
        typeof parsed.fontScalePct === 'number' &&
        parsed.fontScalePct >= 85 &&
        parsed.fontScalePct <= 125
          ? parsed.fontScalePct
          : base.fontScalePct
    };
  } catch {
    return base;
  }
};

export const saveStoredPrintTypography = (
  storageKey: string,
  value: PrintTypographySettings
): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
};

export const getPrintTypographyStyleVars = (
  settings: PrintTypographySettings
): React.CSSProperties => {
  const font = resolvePrintFontOption(settings.fontFamily);
  const sp = resolvePrintSpacingMeta(settings.lineSpacing);
  const scale = (settings.fontScalePct || 100) / 100;
  return {
    ['--pt-font' as string]: font.fontFamily,
    ['--pt-lh' as string]: String(sp.lineHeight),
    ['--pt-cell-py' as string]: `${(sp.cellPyPx * scale).toFixed(1)}px`,
    ['--pt-cell-px' as string]: `${(sp.cellPxPx * Math.max(0.95, scale)).toFixed(1)}px`,
    ['--pt-section-gap' as string]: `${(sp.sectionGapPx * scale).toFixed(1)}px`,
    ['--pt-stack-gap' as string]: `${(sp.stackGapPx * scale).toFixed(1)}px`,
    ['--pt-para-gap' as string]: `${(sp.paraGapPx * scale).toFixed(1)}px`,
    ['--pt-scale' as string]: String(scale),
    fontFamily: font.fontFamily,
    lineHeight: sp.lineHeight
  };
};

export const getScopedPrintTypographyCss = (scopeSelector = '.pt-sheet-scope'): string => `
  ${scopeSelector} {
    font-family: var(--pt-font, 'Inter', Arial, sans-serif);
    line-height: var(--pt-lh, 1.44);
  }
  ${scopeSelector} .pt-prose p,
  ${scopeSelector} .pt-prose div.pt-para {
    line-height: var(--pt-lh, 1.44);
    margin-bottom: var(--pt-para-gap, 10px);
  }
  ${scopeSelector} .pt-prose p:last-child,
  ${scopeSelector} .pt-prose div.pt-para:last-child {
    margin-bottom: 0;
  }
  ${scopeSelector} table.pt-table > thead > tr > th,
  ${scopeSelector} table.pt-table > tbody > tr > td {
    padding-top: var(--pt-cell-py, 5.5px);
    padding-bottom: var(--pt-cell-py, 5.5px);
    padding-left: var(--pt-cell-px, 7px);
    padding-right: var(--pt-cell-px, 7px);
    line-height: var(--pt-lh, 1.44);
  }
  ${scopeSelector} table.pt-table-compact > thead > tr > th,
  ${scopeSelector} table.pt-table-compact > tbody > tr > td {
    padding-top: calc(var(--pt-cell-py, 5.5px) * 0.58);
    padding-bottom: calc(var(--pt-cell-py, 5.5px) * 0.58);
    line-height: calc(var(--pt-lh, 1.44) * 0.92);
  }
  ${scopeSelector} .pt-stack > * + * {
    margin-top: var(--pt-stack-gap, 12px);
  }
  ${scopeSelector} .pt-meta-grid {
    row-gap: calc(var(--pt-para-gap, 10px) * 0.45);
  }
  ${scopeSelector} .pt-scale-text {
    font-size: calc(1em * var(--pt-scale, 1));
  }
`;
