import React, { useId } from 'react';
import {
  CardAccentPattern,
  CardEmbossStyle,
  CardFontStyle,
  CardFontWeight,
  CardLetterSpacing,
  CustomCardTheme,
  SchoolProfile
} from '../types';
import { Sman9SurabayaLogoSvg } from './OfficialStamps';
import {
  Type,
  Shuffle,
  Sparkles,
  Check,
  RotateCcw,
  CopyCheck,
  Ruler,
  ArrowLeftRight,
  AlertTriangle
} from 'lucide-react';

export interface CardFontOptionMeta {
  id: CardFontStyle;
  label: string;
  category: 'Sans' | 'Serif' | 'Display' | 'Mono';
  desc: string;
  bodyFont: string;
  headingFont: string;
  sample: string;
}

export const CARD_FONT_OPTIONS: CardFontOptionMeta[] = [
  {
    id: 'modern_sans',
    label: 'Plus Jakarta Sans',
    category: 'Sans',
    desc: 'Modern Instansi Resmi',
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'clean_inter',
    label: 'Inter',
    category: 'Sans',
    desc: 'Netral Bersih Presisi',
    bodyFont: "'Inter', system-ui, sans-serif",
    headingFont: "'Inter', system-ui, sans-serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'humanist_poppins',
    label: 'Poppins',
    category: 'Sans',
    desc: 'Bulat Ramah Modern',
    bodyFont: "'Poppins', 'Plus Jakarta Sans', sans-serif",
    headingFont: "'Poppins', 'Plus Jakarta Sans', sans-serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'editorial_bold',
    label: 'Outfit Display',
    category: 'Display',
    desc: 'Geometris Tegas',
    bodyFont: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    headingFont: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'condensed_oswald',
    label: 'Oswald',
    category: 'Display',
    desc: 'Judul Tinggi Kompak',
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFont: "'Oswald', 'Outfit', sans-serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'classic_serif',
    label: 'Playfair Display',
    category: 'Serif',
    desc: 'Klasik Berwibawa',
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFont: "'Playfair Display', Georgia, serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'royal_cinzel',
    label: 'Cinzel Piagam',
    category: 'Serif',
    desc: 'Ukiran Serif Resmi',
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFont: "'Cinzel', Georgia, serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'formal_merriweather',
    label: 'Merriweather',
    category: 'Serif',
    desc: 'Serif Surat Dinas',
    bodyFont: "'Merriweather', Georgia, serif",
    headingFont: "'Merriweather', Georgia, serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'academic_lora',
    label: 'Lora Akademik',
    category: 'Serif',
    desc: 'Kaligrafi Akademik',
    bodyFont: "'Lora', Georgia, serif",
    headingFont: "'Lora', Georgia, serif",
    sample: 'SMAN 9 • 01-26'
  },
  {
    id: 'tech_mono',
    label: 'Space Grotesk',
    category: 'Mono',
    desc: 'Teknis Presisi CBT',
    bodyFont: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
    headingFont: "'Space Grotesk', 'JetBrains Mono', monospace",
    sample: 'SMAN 9 • 01-26'
  }
];

export interface GeneratedFontCombo {
  label: string;
  headingFont: CardFontStyle;
  bodyFont: CardFontStyle;
  weight: CardFontWeight;
  spacing: CardLetterSpacing;
  uppercase: boolean;
}

export const FONT_PAIRING_PRESETS: GeneratedFontCombo[] = [
  {
    label: 'Piagam Klasik Resmi',
    headingFont: 'royal_cinzel',
    bodyFont: 'modern_sans',
    weight: 'tebal',
    spacing: 'lebar',
    uppercase: true
  },
  {
    label: 'Editorial Modern Tegas',
    headingFont: 'editorial_bold',
    bodyFont: 'clean_inter',
    weight: 'ekstra',
    spacing: 'standar',
    uppercase: true
  },
  {
    label: 'Headline Kompak CBT',
    headingFont: 'condensed_oswald',
    bodyFont: 'tech_mono',
    weight: 'tebal',
    spacing: 'lebar',
    uppercase: true
  },
  {
    label: 'Seri Akademik Elegan',
    headingFont: 'classic_serif',
    bodyFont: 'humanist_poppins',
    weight: 'tebal',
    spacing: 'standar',
    uppercase: false
  },
  {
    label: 'Dinas Berwibawa',
    headingFont: 'formal_merriweather',
    bodyFont: 'academic_lora',
    weight: 'normal',
    spacing: 'standar',
    uppercase: true
  },
  {
    label: 'Teknis Futuristik',
    headingFont: 'tech_mono',
    bodyFont: 'clean_inter',
    weight: 'tebal',
    spacing: 'lebar',
    uppercase: true
  }
];

export const scaleCardFontPx = (basePx: number, multiplier: number): string =>
  `${+(basePx * multiplier).toFixed(2)}px`;

export const CARD_EMBOSS_OPTIONS: {
  id: CardEmbossStyle;
  label: string;
  desc: string;
}[] = [
  { id: 'soft_relief', label: 'Emboss Halus 3D', desc: 'Efek timbul & bayangan lembut' },
  { id: 'gold_foil', label: 'Foil Logam & Sudut', desc: 'List metalik & siku foil timbul' },
  { id: 'classic_engraved', label: 'Ukir Klasik Ganda', desc: 'Bingkai relief piagam resmi' },
  { id: 'flat_clean', label: 'Datar Minimalis', desc: 'Bersih tanpa relief 3D' }
];

export const CARD_PATTERN_OPTIONS: {
  id: CardAccentPattern;
  label: string;
}[] = [
  { id: 'guilloche_wave', label: 'Guilloche Sekuriti' },
  { id: 'batik_geometris', label: 'Batik Geometris' },
  { id: 'hex_tech', label: 'Hexagon CBT' },
  { id: 'diagonal_silk', label: 'Sutra Diagonal' },
  { id: 'double_border', label: 'Bingkai Ganda' },
  { id: 'corner_ribbon', label: 'Pita Sudut' },
  { id: 'minimal_stripe', label: 'Garis Atas' },
  { id: 'classic_solid', label: 'Polos Bersih' }
];

export const CURATED_DESAIN_PRESETS: CustomCardTheme[] = [
  {
    id: 'curated-safir-foil',
    name: 'Safir Akademik Foil',
    description: 'Gradasi biru laut-safir + list emas timbul & guilloche',
    outerBorderHex: '#1e3a8a',
    bannerBgHex: '#0f172a',
    bannerBgEndHex: '#1d4ed8',
    bannerTextHex: '#ffffff',
    accentTextHex: '#fde68a',
    subBannerBgHex: '#eff6ff',
    subBannerTextHex: '#1e3a8a',
    tableHeaderBgHex: '#dbeafe',
    cardBgHex: '#ffffff',
    cardBgEndHex: '#eff6ff',
    gradientAngle: 145,
    embossHighlightHex: '#d97706',
    fontStyle: 'editorial_bold',
    embossStyle: 'gold_foil',
    accentPattern: 'guilloche_wave',
    showWatermark: true
  },
  {
    id: 'curated-crimson-panitia',
    name: 'Merah Delima Emboss',
    description: 'Gradasi marun tegas panitia + ukir klasik & serif',
    outerBorderHex: '#881337',
    bannerBgHex: '#7f1d1d',
    bannerBgEndHex: '#be123c',
    bannerTextHex: '#ffffff',
    accentTextHex: '#fef08a',
    subBannerBgHex: '#fff1f2',
    subBannerTextHex: '#881337',
    tableHeaderBgHex: '#ffe4e6',
    cardBgHex: '#ffffff',
    cardBgEndHex: '#fff1f2',
    gradientAngle: 140,
    embossHighlightHex: '#ca8a04',
    fontStyle: 'classic_serif',
    embossStyle: 'classic_engraved',
    accentPattern: 'batik_geometris',
    showWatermark: true
  },
  {
    id: 'curated-zamrud-pengawas',
    name: 'Zamrud Pengawas CBT',
    description: 'Gradasi hijau zamrud + pola hex CBT & emboss halus',
    outerBorderHex: '#065f46',
    bannerBgHex: '#064e3b',
    bannerBgEndHex: '#059669',
    bannerTextHex: '#ffffff',
    accentTextHex: '#d1fae5',
    subBannerBgHex: '#ecfdf5',
    subBannerTextHex: '#065f46',
    tableHeaderBgHex: '#d1fae5',
    cardBgHex: '#ffffff',
    cardBgEndHex: '#ecfdf5',
    gradientAngle: 150,
    embossHighlightHex: '#10b981',
    fontStyle: 'tech_mono',
    embossStyle: 'soft_relief',
    accentPattern: 'hex_tech',
    showWatermark: true
  },
  {
    id: 'curated-emas-platinum',
    name: 'Klasik Emas SMANIX',
    description: 'Gradasi biru tua + aksen emas foil & sutra diagonal',
    outerBorderHex: '#1e293b',
    bannerBgHex: '#1e293b',
    bannerBgEndHex: '#334155',
    bannerTextHex: '#ffffff',
    accentTextHex: '#fbbf24',
    subBannerBgHex: '#fefce8',
    subBannerTextHex: '#713f12',
    tableHeaderBgHex: '#fef3c7',
    cardBgHex: '#ffffff',
    cardBgEndHex: '#fffbeb',
    gradientAngle: 135,
    embossHighlightHex: '#d97706',
    fontStyle: 'classic_serif',
    embossStyle: 'gold_foil',
    accentPattern: 'diagonal_silk',
    showWatermark: true
  }
];

export interface BasePaletteInput {
  outerHex: string;
  bannerStartHex: string;
  bannerEndHex: string;
  bannerTextHex: string;
  accentTextHex: string;
  subBannerStartHex: string;
  subBannerEndHex: string;
  subBannerTextHex: string;
  cardTintHex: string;
  foilHex: string;
}

export const BUILTIN_THEME_COLORS: Record<string, BasePaletteInput> = {
  biru: {
    outerHex: '#1e40af',
    bannerStartHex: '#0f172a',
    bannerEndHex: '#1d4ed8',
    bannerTextHex: '#ffffff',
    accentTextHex: '#e0f2fe',
    subBannerStartHex: '#eff6ff',
    subBannerEndHex: '#dbeafe',
    subBannerTextHex: '#1e3a8a',
    cardTintHex: '#eff6ff',
    foilHex: '#3b82f6'
  },
  hijau: {
    outerHex: '#065f46',
    bannerStartHex: '#064e3b',
    bannerEndHex: '#047857',
    bannerTextHex: '#ffffff',
    accentTextHex: '#d1fae5',
    subBannerStartHex: '#ecfdf5',
    subBannerEndHex: '#d1fae5',
    subBannerTextHex: '#064e3b',
    cardTintHex: '#ecfdf5',
    foilHex: '#d97706'
  },
  merah: {
    outerHex: '#9f1239',
    bannerStartHex: '#7f1d1d',
    bannerEndHex: '#be123c',
    bannerTextHex: '#ffffff',
    accentTextHex: '#fef08a',
    subBannerStartHex: '#fff1f2',
    subBannerEndHex: '#ffe4e6',
    subBannerTextHex: '#881337',
    cardTintHex: '#fff1f2',
    foilHex: '#ca8a04'
  },
  kuning: {
    outerHex: '#b45309',
    bannerStartHex: '#f59e0b',
    bannerEndHex: '#fbbf24',
    bannerTextHex: '#0f172a',
    accentTextHex: '#451a03',
    subBannerStartHex: '#fffbeb',
    subBannerEndHex: '#fef3c7',
    subBannerTextHex: '#78350f',
    cardTintHex: '#fffbeb',
    foilHex: '#b45309'
  },
  abu_abu: {
    outerHex: '#334155',
    bannerStartHex: '#334155',
    bannerEndHex: '#475569',
    bannerTextHex: '#ffffff',
    accentTextHex: '#f1f5f9',
    subBannerStartHex: '#f8fafc',
    subBannerEndHex: '#e2e8f0',
    subBannerTextHex: '#0f172a',
    cardTintHex: '#f1f5f9',
    foilHex: '#64748b'
  },
  navy: {
    outerHex: '#0f172a',
    bannerStartHex: '#020617',
    bannerEndHex: '#1e293b',
    bannerTextHex: '#ffffff',
    accentTextHex: '#fbbf24',
    subBannerStartHex: '#f8fafc',
    subBannerEndHex: '#e2e8f0',
    subBannerTextHex: '#0f172a',
    cardTintHex: '#f8fafc',
    foilHex: '#d97706'
  },
  monokrom: {
    outerHex: '#000000',
    bannerStartHex: '#ffffff',
    bannerEndHex: '#f8fafc',
    bannerTextHex: '#000000',
    accentTextHex: '#000000',
    subBannerStartHex: '#ffffff',
    subBannerEndHex: '#f8fafc',
    subBannerTextHex: '#000000',
    cardTintHex: '#ffffff',
    foilHex: '#334155'
  }
};

export interface ResolvedCardDesign {
  fontStyle: CardFontStyle;
  bodyFontStyle: CardFontStyle;
  embossStyle: CardEmbossStyle;
  accentPattern: CardAccentPattern;
  gradasiAktif: boolean;
  showWatermark: boolean;
  bodyFontFamily: string;
  headingFontFamily: string;
  fontScaleMultiplier: number;
  headingFontWeightCss: number;
  bodyStrongFontWeightCss: number;
  headingLetterSpacingCss: string;
  headingTextTransformCss: 'uppercase' | 'none';
  outerBorderHex: string;
  foilHex: string;
  cardBackgroundCss: string;
  bannerBackgroundCss: string;
  subBannerBackgroundCss: string;
  bannerTextHex: string;
  accentTextHex: string;
  subBannerTextHex: string;
  outerEmbossShadowCss?: string;
  headingEmbossTextShadow?: string;
}

export const resolveCardDesign = (params: {
  themeKey: string;
  customTheme?: CustomCardTheme | null;
  overrideFont?: CardFontStyle;
  overrideFontBody?: CardFontStyle;
  overrideFontScale?: number;
  overrideFontWeight?: CardFontWeight;
  overrideLetterSpacing?: CardLetterSpacing;
  overrideJudulKapital?: boolean;
  overrideEmboss?: CardEmbossStyle;
  overridePattern?: CardAccentPattern;
  overrideGradasi?: boolean;
  overrideWatermark?: boolean;
}): ResolvedCardDesign => {
  const {
    themeKey,
    customTheme,
    overrideFont,
    overrideFontBody,
    overrideFontScale,
    overrideFontWeight,
    overrideLetterSpacing,
    overrideJudulKapital,
    overrideEmboss,
    overridePattern,
    overrideGradasi,
    overrideWatermark
  } = params;

  const base = BUILTIN_THEME_COLORS[themeKey] || BUILTIN_THEME_COLORS.biru;
  const isCustom = themeKey === 'ai_custom' && Boolean(customTheme);
  const isMonokrom = !isCustom && themeKey === 'monokrom';

  const fontStyle: CardFontStyle =
    overrideFont || (isCustom ? customTheme?.fontStyle : undefined) || 'modern_sans';
  const bodyFontStyle: CardFontStyle =
    overrideFontBody ||
    (isCustom ? customTheme?.fontBodyStyle : undefined) ||
    fontStyle;

  const embossStyle: CardEmbossStyle =
    overrideEmboss ||
    (isCustom ? customTheme?.embossStyle : undefined) ||
    (isMonokrom ? 'flat_clean' : 'soft_relief');
  const accentPattern: CardAccentPattern =
    overridePattern ||
    (isCustom ? customTheme?.accentPattern : undefined) ||
    (isMonokrom ? 'classic_solid' : 'guilloche_wave');
  const gradasiAktif =
    overrideGradasi !== undefined ? overrideGradasi : !isMonokrom;
  const showWatermark =
    overrideWatermark !== undefined
      ? overrideWatermark
      : isCustom && customTheme?.showWatermark !== undefined
      ? customTheme.showWatermark
      : !isMonokrom;

  const headingFontMeta =
    CARD_FONT_OPTIONS.find(f => f.id === fontStyle) || CARD_FONT_OPTIONS[0];
  const bodyFontMeta =
    CARD_FONT_OPTIONS.find(f => f.id === bodyFontStyle) || headingFontMeta;

  const clampedPct =
    typeof overrideFontScale === 'number' && overrideFontScale >= 80 && overrideFontScale <= 125
      ? overrideFontScale
      : 100;
  const fontScaleMultiplier = clampedPct / 100;

  const weightChoice: CardFontWeight = overrideFontWeight || 'tebal';
  const headingFontWeightCss =
    weightChoice === 'normal' ? 700 : weightChoice === 'ekstra' ? 900 : 800;
  const bodyStrongFontWeightCss =
    weightChoice === 'normal' ? 600 : weightChoice === 'ekstra' ? 800 : 700;

  const spacingChoice: CardLetterSpacing = overrideLetterSpacing || 'standar';
  const headingLetterSpacingCss =
    spacingChoice === 'rapat' ? '-0.015em' : spacingChoice === 'lebar' ? '0.09em' : '0.03em';

  const headingTextTransformCss: 'uppercase' | 'none' =
    overrideJudulKapital === false ? 'none' : 'uppercase';

  const outerBorderHex = isCustom ? customTheme!.outerBorderHex : base.outerHex;
  const foilHex = isCustom
    ? customTheme?.embossHighlightHex || customTheme!.outerBorderHex
    : base.foilHex;

  const bannerStart = isCustom ? customTheme!.bannerBgHex : base.bannerStartHex;
  const bannerEnd = isCustom
    ? customTheme?.bannerBgEndHex || customTheme!.bannerBgHex
    : base.bannerEndHex;
  const bannerTextHex = isCustom ? customTheme!.bannerTextHex : base.bannerTextHex;
  const accentTextHex = isCustom
    ? customTheme!.accentTextHex || bannerTextHex
    : base.accentTextHex;

  const subStart = isCustom ? customTheme!.subBannerBgHex : base.subBannerStartHex;
  const subEnd = isCustom
    ? customTheme?.cardBgEndHex || customTheme!.subBannerBgHex
    : base.subBannerEndHex;
  const subBannerTextHex = isCustom ? customTheme!.subBannerTextHex : base.subBannerTextHex;

  const cardStart = isCustom ? customTheme?.cardBgHex || '#ffffff' : '#ffffff';
  const cardEnd = isCustom
    ? customTheme?.cardBgEndHex || customTheme!.subBannerBgHex
    : base.cardTintHex;
  const angle = isCustom && customTheme?.gradientAngle ? customTheme.gradientAngle : 145;

  const cardBackgroundCss = gradasiAktif
    ? `linear-gradient(${angle}deg, ${cardStart} 0%, #ffffff 42%, ${cardEnd} 100%)`
    : '#ffffff';

  const bannerBackgroundCss = gradasiAktif
    ? `linear-gradient(135deg, ${bannerStart} 0%, ${bannerEnd} 100%)`
    : bannerStart;

  const subBannerBackgroundCss = gradasiAktif
    ? `linear-gradient(90deg, ${subStart} 0%, #ffffff 50%, ${subEnd} 100%)`
    : subStart;

  const isLightBanner = bannerTextHex.toLowerCase() !== '#ffffff';

  let outerEmbossShadowCss: string | undefined;
  let headingEmbossTextShadow: string | undefined;

  if (embossStyle === 'soft_relief') {
    outerEmbossShadowCss =
      'inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1.5px 0 rgba(15,23,42,0.14)';
    headingEmbossTextShadow = isLightBanner
      ? '0 1px 0 rgba(255,255,255,0.65)'
      : '0 1px 1px rgba(0,0,0,0.45)';
  } else if (embossStyle === 'gold_foil') {
    outerEmbossShadowCss = `inset 0 0 0 1px rgba(255,255,255,0.85), inset 0 0 0 2.5px ${foilHex}40, inset 0 2px 6px rgba(15,23,42,0.08)`;
    headingEmbossTextShadow = isLightBanner
      ? `0 1px 0 rgba(255,255,255,0.8), 0 -0.5px 0 ${foilHex}55`
      : `0 1px 1.5px rgba(0,0,0,0.6), 0 0 6px ${foilHex}55`;
  } else if (embossStyle === 'classic_engraved') {
    outerEmbossShadowCss = `inset 0 0 0 2px #ffffff, inset 0 0 0 3px ${outerBorderHex}66, inset 0 -2px 4px rgba(15,23,42,0.12)`;
    headingEmbossTextShadow = isLightBanner
      ? '1px 1px 0 rgba(255,255,255,0.9), -0.5px -0.5px 0 rgba(15,23,42,0.2)'
      : '1px 1px 0 rgba(0,0,0,0.55), -0.5px -0.5px 0 rgba(255,255,255,0.22)';
  }

  return {
    fontStyle,
    bodyFontStyle,
    embossStyle,
    accentPattern,
    gradasiAktif,
    showWatermark,
    bodyFontFamily: overrideFontBody ? bodyFontMeta.headingFont : headingFontMeta.bodyFont,
    headingFontFamily: headingFontMeta.headingFont,
    fontScaleMultiplier,
    headingFontWeightCss,
    bodyStrongFontWeightCss,
    headingLetterSpacingCss,
    headingTextTransformCss,
    outerBorderHex,
    foilHex,
    cardBackgroundCss,
    bannerBackgroundCss,
    subBannerBackgroundCss,
    bannerTextHex,
    accentTextHex,
    subBannerTextHex,
    outerEmbossShadowCss,
    headingEmbossTextShadow
  };
};

interface CardBackgroundLayersProps {
  design: ResolvedCardDesign;
  profile: SchoolProfile;
}

export const CardBackgroundLayers: React.FC<CardBackgroundLayersProps> = ({ design, profile }) => {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9]/g, '');
  const { accentPattern, embossStyle, outerBorderHex, foilHex, showWatermark, gradasiAktif } =
    design;

  return (
    <>
      {/* 1. Vector Security / Geometric Background Texture Layer */}
      {accentPattern === 'guilloche_wave' && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern id={`pat-guil-${uid}`} width="48" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M0 12 Q 12 2, 24 12 T 48 12"
                fill="none"
                stroke={outerBorderHex}
                strokeWidth="0.6"
                strokeOpacity="0.11"
              />
              <path
                d="M0 12 Q 12 22, 24 12 T 48 12"
                fill="none"
                stroke={foilHex}
                strokeWidth="0.5"
                strokeOpacity="0.10"
              />
              <path
                d="M-12 24 Q 0 14, 12 24 T 36 24 T 60 24"
                fill="none"
                stroke={outerBorderHex}
                strokeWidth="0.45"
                strokeOpacity="0.08"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pat-guil-${uid})`} />
        </svg>
      )}

      {accentPattern === 'batik_geometris' && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern id={`pat-batik-${uid}`} width="28" height="28" patternUnits="userSpaceOnUse">
              <circle
                cx="14"
                cy="14"
                r="10"
                fill="none"
                stroke={outerBorderHex}
                strokeWidth="0.55"
                strokeOpacity="0.1"
              />
              <path
                d="M14 2 L26 14 L14 26 L2 14 Z"
                fill="none"
                stroke={foilHex}
                strokeWidth="0.55"
                strokeOpacity="0.11"
              />
              <circle cx="14" cy="14" r="1.4" fill={outerBorderHex} fillOpacity="0.12" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pat-batik-${uid})`} />
        </svg>
      )}

      {accentPattern === 'hex_tech' && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id={`pat-hex-${uid}`}
              width="24"
              height="20.78"
              patternUnits="userSpaceOnUse"
            >
              <polygon
                points="6,0 18,0 24,10.39 18,20.78 6,20.78 0,10.39"
                fill="none"
                stroke={outerBorderHex}
                strokeWidth="0.55"
                strokeOpacity="0.1"
              />
              <circle cx="12" cy="10.39" r="0.9" fill={foilHex} fillOpacity="0.14" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pat-hex-${uid})`} />
        </svg>
      )}

      {accentPattern === 'diagonal_silk' && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id={`pat-silk-${uid}`}
              width="12"
              height="12"
              patternTransform="rotate(35)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke={outerBorderHex}
                strokeWidth="0.7"
                strokeOpacity="0.09"
              />
              <line
                x1="6"
                y1="0"
                x2="6"
                y2="12"
                stroke={foilHex}
                strokeWidth="0.5"
                strokeOpacity="0.08"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pat-silk-${uid})`} />
        </svg>
      )}

      {/* Radial soft sheen when gradient is active */}
      {gradasiAktif && (
        <div
          className="absolute inset-0 pointer-events-none select-none z-0"
          style={{
            background: `radial-gradient(circle at 12% 14%, rgba(255,255,255,0.75) 0%, transparent 48%), radial-gradient(circle at 92% 88%, ${foilHex}14 0%, transparent 45%)`
          }}
          aria-hidden="true"
        />
      )}

      {/* 2. Subtle Emboss Watermark Emblem in Center */}
      {showWatermark && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="opacity-[0.075] contrast-125 scale-110">
            {profile.logoType === 'custom' && profile.logoUrl ? (
              <img src={profile.logoUrl} alt="" className="w-24 h-24 object-contain" />
            ) : (
              <Sman9SurabayaLogoSvg className="w-24 h-24" monochrome />
            )}
          </div>
        </div>
      )}

      {/* 3. Accent Overlay Styles */}
      {accentPattern === 'minimal_stripe' && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none z-10"
          style={{
            background: `linear-gradient(90deg, ${outerBorderHex}, ${foilHex}, ${outerBorderHex})`
          }}
          aria-hidden="true"
        />
      )}

      {accentPattern === 'corner_ribbon' && (
        <div
          className="absolute top-0 right-0 w-5 h-5 pointer-events-none z-10"
          style={{
            background: `linear-gradient(135deg, ${foilHex}, ${outerBorderHex})`,
            clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
            opacity: 0.9
          }}
          aria-hidden="true"
        />
      )}

      {accentPattern === 'double_border' && (
        <div
          className="absolute inset-[3px] border pointer-events-none z-10"
          style={{ borderColor: outerBorderHex, opacity: 0.5 }}
          aria-hidden="true"
        />
      )}

      {/* 4. 3D Foil & Engraved Frame Corner Ornaments */}
      {embossStyle === 'gold_foil' && (
        <>
          <div
            className="absolute top-[3px] left-[3px] w-2.5 h-2.5 border-t-[2px] border-l-[2px] pointer-events-none z-10"
            style={{ borderColor: foilHex }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[3px] right-[3px] w-2.5 h-2.5 border-t-[2px] border-r-[2px] pointer-events-none z-10"
            style={{ borderColor: foilHex }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-[3px] left-[3px] w-2.5 h-2.5 border-b-[2px] border-l-[2px] pointer-events-none z-10"
            style={{ borderColor: foilHex }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-[3px] right-[3px] w-2.5 h-2.5 border-b-[2px] border-r-[2px] pointer-events-none z-10"
            style={{ borderColor: foilHex }}
            aria-hidden="true"
          />
        </>
      )}

      {embossStyle === 'classic_engraved' && (
        <div
          className="absolute inset-[2.5px] border pointer-events-none z-10"
          style={{
            borderColor: foilHex,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8)'
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export interface CardFontStudioValue {
  headingFont?: CardFontStyle;
  bodyFont?: CardFontStyle;
  panitiaFont?: CardFontStyle;
  pengawasFont?: CardFontStyle;
  fontScale?: number;
  fontWeight?: CardFontWeight;
  letterSpacing?: CardLetterSpacing;
  uppercaseTitle?: boolean;
}

interface CardFontStudioPanelProps {
  mode: 'panitia_pengawas' | 'peserta';
  value: CardFontStudioValue;
  onChange: (patch: Partial<CardFontStudioValue>) => void;
  onGenerateAiFontAndTheme?: (promptHint: string) => void;
  isGeneratingAi?: boolean;
  onApplyToAllCardTypes?: () => void;
}

export const CardFontStudioPanel: React.FC<CardFontStudioPanelProps> = ({
  mode,
  value,
  onChange,
  onGenerateAiFontAndTheme,
  isGeneratingAi,
  onApplyToAllCardTypes
}) => {
  const [roleTarget, setRoleTarget] = React.useState<'keduanya' | 'panitia' | 'pengawas'>('keduanya');
  const [fontCategoryFilter, setFontCategoryFilter] = React.useState<
    'ALL' | 'Sans' | 'Serif' | 'Display' | 'Mono'
  >('ALL');

  const activeHeadingFont: CardFontStyle =
    mode === 'panitia_pengawas' && roleTarget === 'panitia'
      ? value.panitiaFont || value.headingFont || 'modern_sans'
      : mode === 'panitia_pengawas' && roleTarget === 'pengawas'
      ? value.pengawasFont || value.headingFont || 'modern_sans'
      : value.headingFont || 'modern_sans';

  const currentScale = value.fontScale ?? 100;
  const currentWeight: CardFontWeight = value.fontWeight || 'tebal';
  const currentSpacing: CardLetterSpacing = value.letterSpacing || 'standar';
  const currentUppercase = value.uppercaseTitle !== false;

  const visibleFonts =
    fontCategoryFilter === 'ALL'
      ? CARD_FONT_OPTIONS
      : CARD_FONT_OPTIONS.filter(f => f.category === fontCategoryFilter);

  const handleSelectHeadingFont = (fontId: CardFontStyle) => {
    if (mode === 'peserta' || roleTarget === 'keduanya') {
      onChange({
        headingFont: fontId,
        panitiaFont: undefined,
        pengawasFont: undefined
      });
    } else if (roleTarget === 'panitia') {
      onChange({ panitiaFont: fontId });
    } else {
      onChange({ pengawasFont: fontId });
    }
  };

  const handleRandomGenerateCombo = () => {
    const others = FONT_PAIRING_PRESETS.filter(p => p.headingFont !== activeHeadingFont);
    const pool = others.length > 0 ? others : FONT_PAIRING_PRESETS;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (mode === 'panitia_pengawas' && roleTarget === 'panitia') {
      onChange({
        panitiaFont: picked.headingFont,
        bodyFont: picked.bodyFont,
        fontWeight: picked.weight,
        letterSpacing: picked.spacing,
        uppercaseTitle: picked.uppercase
      });
    } else if (mode === 'panitia_pengawas' && roleTarget === 'pengawas') {
      onChange({
        pengawasFont: picked.headingFont,
        bodyFont: picked.bodyFont,
        fontWeight: picked.weight,
        letterSpacing: picked.spacing,
        uppercaseTitle: picked.uppercase
      });
    } else {
      onChange({
        headingFont: picked.headingFont,
        bodyFont: picked.bodyFont,
        panitiaFont: undefined,
        pengawasFont: undefined,
        fontWeight: picked.weight,
        letterSpacing: picked.spacing,
        uppercaseTitle: picked.uppercase
      });
    }
  };

  const activeFontMeta =
    CARD_FONT_OPTIONS.find(f => f.id === activeHeadingFont) || CARD_FONT_OPTIONS[0];
  const activeBodyMeta = value.bodyFont
    ? CARD_FONT_OPTIONS.find(f => f.id === value.bodyFont) || activeFontMeta
    : activeFontMeta;

  return (
    <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/50 space-y-3">
      {/* Header & Target Role Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-sky-950 text-xs">
          <Type className="w-4 h-4 text-sky-700" />
          <span>Pengaturan & Galeri Macam Font Kartu (Dapat Disesuaikan & Digenerate)</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {mode === 'panitia_pengawas' && (
            <div className="inline-flex rounded border border-sky-300 bg-white p-0.5 text-[10.5px]">
              {[
                { id: 'keduanya', label: 'Panitia & Pengawas' },
                { id: 'panitia', label: 'Khusus Panitia' },
                { id: 'pengawas', label: 'Khusus Pengawas' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRoleTarget(t.id as any)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    roleTarget === t.id
                      ? 'bg-sky-700 text-white'
                      : 'text-slate-700 hover:bg-sky-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleRandomGenerateCombo}
            className="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-800 text-white text-[10.5px] font-bold flex items-center gap-1 shadow-2xs"
            title="Acak dan terapkan kombinasi pasangan font resmi secara instan"
          >
            <Shuffle className="w-3 h-3" />
            <span>Generate Kombinasi Font</span>
          </button>

          {onGenerateAiFontAndTheme && (
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() =>
                onGenerateAiFontAndTheme(
                  `Pilihan kombinasi font berkarakter (${activeFontMeta.label} & ${activeBodyMeta.label}) dengan emboss elegan dan gradasi serasi`
                )
              }
              className="px-2.5 py-1 rounded bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-[10.5px] font-bold flex items-center gap-1 shadow-2xs"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isGeneratingAi ? 'Proses AI...' : 'Generate AI + Tema'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category filter + Active pairing indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'ALL', label: `Semua (${CARD_FONT_OPTIONS.length})` },
              { id: 'Sans', label: 'Sans Modern' },
              { id: 'Serif', label: 'Serif Resmi' },
              { id: 'Display', label: 'Display Tegas' },
              { id: 'Mono', label: 'Teknis CBT' }
            ] as const
          ).map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFontCategoryFilter(cat.id)}
              className={`px-2 py-0.5 rounded border font-semibold ${
                fontCategoryFilter === cat.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
          {mode === 'panitia_pengawas' ? (
            <>
              <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-900 font-semibold">
                Panitia:{' '}
                {(
                  CARD_FONT_OPTIONS.find(
                    f => f.id === (value.panitiaFont || value.headingFont || 'modern_sans')
                  ) || CARD_FONT_OPTIONS[0]
                ).label}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                Pengawas:{' '}
                {(
                  CARD_FONT_OPTIONS.find(
                    f => f.id === (value.pengawasFont || value.headingFont || 'modern_sans')
                  ) || CARD_FONT_OPTIONS[0]
                ).label}
              </span>
            </>
          ) : (
            <span className="px-2 py-0.5 rounded bg-white border border-sky-200 font-semibold text-sky-900">
              Font Judul: <strong>{activeFontMeta.label}</strong> • Isi:{' '}
              <strong>{value.bodyFont ? activeBodyMeta.label : 'Selaras Utama'}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Visual Font Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
        {visibleFonts.map(font => {
          const isSelected = activeHeadingFont === font.id;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => handleSelectHeadingFont(font.id)}
              className={`p-2 rounded-lg border text-left transition-all relative ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-sky-400 shadow-xs'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-sky-400 hover:bg-sky-50/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span
                  className={`text-[8.5px] font-bold px-1 py-0.2 rounded uppercase ${
                    isSelected ? 'bg-sky-500/30 text-sky-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {font.category}
                </span>
                {isSelected && <Check className="w-3 h-3 text-sky-300 shrink-0" />}
              </div>
              <div
                style={{ fontFamily: font.headingFont }}
                className="text-[12px] font-bold leading-tight truncate"
              >
                {font.sample}
              </div>
              <div
                className={`text-[10px] font-bold truncate mt-0.5 ${
                  isSelected ? 'text-amber-300' : 'text-slate-900'
                }`}
              >
                {font.label}
              </div>
              <div
                className={`text-[8.5px] truncate ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {font.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fine-Tuning Controls: Body Font + Font Scale % + Weight + Tracking + Case */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-2.5 rounded-lg bg-white border border-sky-200/80 text-[11px]">
        {/* Font Body / Data Biodata */}
        <div>
          <label className="block text-[10px] font-bold text-slate-700 mb-1">
            Font Teks Isi & Biodata
          </label>
          <select
            value={value.bodyFont || ''}
            onChange={e =>
              onChange({
                bodyFont: (e.target.value || undefined) as CardFontStyle | undefined
              })
            }
            className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px] font-semibold"
          >
            <option value="">Selaras dengan Font Judul</option>
            {CARD_FONT_OPTIONS.map(f => (
              <option key={f.id} value={f.id}>
                {f.label} ({f.category})
              </option>
            ))}
          </select>
        </div>

        {/* Ukuran Font / Scale Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-700">Skala Ukuran Huruf</label>
            <span className="font-mono font-bold text-[10.5px] text-sky-800">{currentScale}%</span>
          </div>
          <input
            type="range"
            min={85}
            max={120}
            step={5}
            value={currentScale}
            onChange={e => onChange({ fontScale: Number(e.target.value) })}
            className="w-full accent-sky-700 cursor-pointer"
          />
          <div className="flex justify-between gap-1 mt-0.5 text-[9px]">
            {[90, 100, 110, 115].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => onChange({ fontScale: pct })}
                className={`px-1.5 py-0.5 rounded border font-mono font-bold ${
                  currentScale === pct
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Ketebalan & Spasi */}
        <div>
          <label className="block text-[10px] font-bold text-slate-700 mb-1">
            Ketebalan & Spasi Judul
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={currentWeight}
              onChange={e => onChange({ fontWeight: e.target.value as CardFontWeight })}
              className="px-1.5 py-1 border border-slate-300 rounded bg-white text-[10.5px] font-semibold"
            >
              <option value="normal">Tebal Normal</option>
              <option value="tebal">Tebal Tegas</option>
              <option value="ekstra">Ekstra Bold</option>
            </select>
            <select
              value={currentSpacing}
              onChange={e => onChange({ letterSpacing: e.target.value as CardLetterSpacing })}
              className="px-1.5 py-1 border border-slate-300 rounded bg-white text-[10.5px] font-semibold"
            >
              <option value="rapat">Spasi Rapat</option>
              <option value="standar">Spasi Standar</option>
              <option value="lebar">Spasi Lebar</option>
            </select>
          </div>
        </div>

        {/* Kapitalisasi + Reset & Apply to All */}
        <div className="flex flex-col justify-between gap-1.5">
          <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-800 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={currentUppercase}
              onChange={e => onChange({ uppercaseTitle: e.target.checked })}
              className="rounded text-sky-700"
            />
            <span>Judul Banner Huruf Kapital</span>
          </label>
          <div className="flex flex-wrap items-center gap-1">
            {FONT_PAIRING_PRESETS.slice(0, 2).map(combo => (
              <button
                key={combo.label}
                type="button"
                onClick={() =>
                  onChange({
                    headingFont: combo.headingFont,
                    bodyFont: combo.bodyFont,
                    panitiaFont: undefined,
                    pengawasFont: undefined,
                    fontWeight: combo.weight,
                    letterSpacing: combo.spacing,
                    uppercaseTitle: combo.uppercase
                  })
                }
                className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-sky-50 text-[9.5px] font-semibold text-slate-700"
              >
                {combo.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  headingFont: undefined,
                  bodyFont: undefined,
                  panitiaFont: undefined,
                  pengawasFont: undefined,
                  fontScale: 100,
                  fontWeight: 'tebal',
                  letterSpacing: 'standar',
                  uppercaseTitle: true
                })
              }
              className="px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-[9.5px] font-semibold text-slate-700 flex items-center gap-0.5"
              title="Kembalikan pengaturan font ke standar"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cross-card Sync Action */}
      {onApplyToAllCardTypes && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-white/90 border border-sky-200 text-[10.5px]">
          <span className="text-slate-700 font-medium">
            Ingin menyamakan gaya & ukuran font ke seluruh jenis kartu?
          </span>
          <button
            type="button"
            onClick={onApplyToAllCardTypes}
            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1"
          >
            <CopyCheck className="w-3.5 h-3.5" />
            <span>
              Terapkan Pengaturan Font ke Kartu Panitia, Pengawas & Peserta
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export interface CardDimensionsStudioValue {
  sharedWidthMm?: number;
  sharedHeightMm?: number;
  panitiaWidthMm?: number;
  panitiaHeightMm?: number;
  pengawasWidthMm?: number;
  pengawasHeightMm?: number;
}

export interface CardDimensionPreset {
  id: string;
  label: string;
  widthMm?: number;
  heightMm?: number;
  desc: string;
}

export const CARD_DIMENSION_PRESETS: CardDimensionPreset[] = [
  {
    id: 'auto',
    label: 'Otomatis Grid Kertas',
    widthMm: undefined,
    heightMm: undefined,
    desc: 'Pas sesuai kolom & halaman'
  },
  {
    id: 'ujian_standar',
    label: 'Standar Ujian 92×88 mm',
    widthMm: 92,
    heightMm: 88,
    desc: 'Ideal 2 kolom A4'
  },
  {
    id: 'b2_id',
    label: 'Name Tag B2 105×75 mm',
    widthMm: 105,
    heightMm: 75,
    desc: 'Plastik ID Panitia Besar'
  },
  {
    id: 'nametag_portrait',
    label: 'Portrait Lanyard 75×105 mm',
    widthMm: 75,
    heightMm: 105,
    desc: 'Kartu gantung vertikal'
  },
  {
    id: 'b1_sedang',
    label: 'ID B1 Sedang 95×65 mm',
    widthMm: 95,
    heightMm: 65,
    desc: 'Casing ID B1 / Sedang'
  },
  {
    id: 'cr80',
    label: 'CR80 / ATM 86×54 mm',
    widthMm: 86,
    heightMm: 54,
    desc: 'Ukuran PVC / KTP standar'
  },
  {
    id: 'lebar_panitia',
    label: 'Kartu Lebar 120×80 mm',
    widthMm: 120,
    heightMm: 80,
    desc: 'Ruang tulis & TTD lega'
  }
];

interface CardDimensionsStudioPanelProps {
  mode: 'panitia_pengawas' | 'peserta';
  value: CardDimensionsStudioValue;
  autoWidthMm: number;
  autoHeightMm: number;
  cols: number;
  rowsPerPage: number;
  gapMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  paperLabel: string;
  onChange: (patch: Partial<CardDimensionsStudioValue>) => void;
  onApplyToAllCardTypes?: () => void;
}

const isValidCardMm = (val: unknown, min: number): val is number =>
  typeof val === 'number' && Number.isFinite(val) && val >= min;

export const CardDimensionsStudioPanel: React.FC<CardDimensionsStudioPanelProps> = ({
  mode,
  value,
  autoWidthMm,
  autoHeightMm,
  cols,
  rowsPerPage,
  gapMm,
  printableWidthMm,
  printableHeightMm,
  paperLabel,
  onChange,
  onApplyToAllCardTypes
}) => {
  const [targetScope, setTargetScope] = React.useState<'all' | 'panitia' | 'pengawas'>('all');

  const resolvedPanitiaW =
    (isValidCardMm(value.panitiaWidthMm, 40) ? value.panitiaWidthMm : undefined) ??
    (isValidCardMm(value.sharedWidthMm, 40) ? value.sharedWidthMm : undefined) ??
    autoWidthMm;
  const resolvedPanitiaH =
    (isValidCardMm(value.panitiaHeightMm, 35) ? value.panitiaHeightMm : undefined) ??
    (isValidCardMm(value.sharedHeightMm, 35) ? value.sharedHeightMm : undefined) ??
    autoHeightMm;

  const resolvedPengawasW =
    (isValidCardMm(value.pengawasWidthMm, 40) ? value.pengawasWidthMm : undefined) ??
    (isValidCardMm(value.sharedWidthMm, 40) ? value.sharedWidthMm : undefined) ??
    autoWidthMm;
  const resolvedPengawasH =
    (isValidCardMm(value.pengawasHeightMm, 35) ? value.pengawasHeightMm : undefined) ??
    (isValidCardMm(value.sharedHeightMm, 35) ? value.sharedHeightMm : undefined) ??
    autoHeightMm;

  const resolvedPesertaW =
    (isValidCardMm(value.sharedWidthMm, 40) ? value.sharedWidthMm : undefined) ?? autoWidthMm;
  const resolvedPesertaH =
    (isValidCardMm(value.sharedHeightMm, 35) ? value.sharedHeightMm : undefined) ?? autoHeightMm;

  const activeW =
    mode === 'peserta'
      ? resolvedPesertaW
      : targetScope === 'panitia'
      ? resolvedPanitiaW
      : targetScope === 'pengawas'
      ? resolvedPengawasW
      : resolvedPanitiaW;

  const activeH =
    mode === 'peserta'
      ? resolvedPesertaH
      : targetScope === 'panitia'
      ? resolvedPanitiaH
      : targetScope === 'pengawas'
      ? resolvedPengawasH
      : resolvedPanitiaH;

  const isActiveCustom =
    mode === 'peserta'
      ? isValidCardMm(value.sharedWidthMm, 40) || isValidCardMm(value.sharedHeightMm, 35)
      : targetScope === 'panitia'
      ? isValidCardMm(value.panitiaWidthMm, 40) ||
        isValidCardMm(value.panitiaHeightMm, 35) ||
        isValidCardMm(value.sharedWidthMm, 40) ||
        isValidCardMm(value.sharedHeightMm, 35)
      : targetScope === 'pengawas'
      ? isValidCardMm(value.pengawasWidthMm, 40) ||
        isValidCardMm(value.pengawasHeightMm, 35) ||
        isValidCardMm(value.sharedWidthMm, 40) ||
        isValidCardMm(value.sharedHeightMm, 35)
      : isValidCardMm(value.sharedWidthMm, 40) ||
        isValidCardMm(value.sharedHeightMm, 35) ||
        isValidCardMm(value.panitiaWidthMm, 40) ||
        isValidCardMm(value.pengawasWidthMm, 40);

  const applyDimPatch = (nextW: number | undefined, nextH: number | undefined) => {
    if (mode === 'peserta') {
      onChange({ sharedWidthMm: nextW, sharedHeightMm: nextH });
      return;
    }
    if (targetScope === 'panitia') {
      onChange({ panitiaWidthMm: nextW, panitiaHeightMm: nextH });
    } else if (targetScope === 'pengawas') {
      onChange({ pengawasWidthMm: nextW, pengawasHeightMm: nextH });
    } else {
      onChange({
        sharedWidthMm: nextW,
        sharedHeightMm: nextH,
        panitiaWidthMm: undefined,
        panitiaHeightMm: undefined,
        pengawasWidthMm: undefined,
        pengawasHeightMm: undefined
      });
    }
  };

  const applyWidthOnly = (nextW: number) => {
    const clamped = Math.max(40, Math.min(250, Math.round(nextW * 10) / 10));
    if (mode === 'peserta') {
      onChange({ sharedWidthMm: clamped });
      return;
    }
    if (targetScope === 'panitia') {
      onChange({ panitiaWidthMm: clamped });
    } else if (targetScope === 'pengawas') {
      onChange({ pengawasWidthMm: clamped });
    } else {
      onChange({
        sharedWidthMm: clamped,
        panitiaWidthMm: undefined,
        pengawasWidthMm: undefined
      });
    }
  };

  const applyHeightOnly = (nextH: number) => {
    const clamped = Math.max(35, Math.min(250, Math.round(nextH * 10) / 10));
    if (mode === 'peserta') {
      onChange({ sharedHeightMm: clamped });
      return;
    }
    if (targetScope === 'panitia') {
      onChange({ panitiaHeightMm: clamped });
    } else if (targetScope === 'pengawas') {
      onChange({ pengawasHeightMm: clamped });
    } else {
      onChange({
        sharedHeightMm: clamped,
        panitiaHeightMm: undefined,
        pengawasHeightMm: undefined
      });
    }
  };

  const maxCheckW =
    mode === 'panitia_pengawas' ? Math.max(resolvedPanitiaW, resolvedPengawasW) : resolvedPesertaW;
  const maxCheckH =
    mode === 'panitia_pengawas' ? Math.max(resolvedPanitiaH, resolvedPengawasH) : resolvedPesertaH;
  const usedGridW = Math.round((cols * maxCheckW + gapMm * Math.max(0, cols - 1)) * 10) / 10;
  const usedGridH =
    Math.round((rowsPerPage * maxCheckH + gapMm * Math.max(0, rowsPerPage - 1)) * 10) / 10;
  const overflowW = usedGridW > printableWidthMm + 0.5;
  const overflowH = usedGridH > printableHeightMm + 0.5;

  return (
    <div className="p-3.5 rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 space-y-3 text-xs">
      {/* Header & Target Role Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <Ruler className="w-4 h-4 text-amber-700" />
          <span>
            Pengaturan Lebar & Tinggi Kartu Presisi (mm) —{' '}
            {mode === 'panitia_pengawas' ? 'Panitia & Pengawas' : 'Peserta Didik'}
          </span>
        </div>

        {mode === 'panitia_pengawas' ? (
          <div className="flex flex-wrap items-center gap-1 bg-white border border-amber-200 rounded-md p-0.5 text-[10.5px]">
            {[
              { id: 'all', label: 'Panitia & Pengawas' },
              { id: 'panitia', label: 'Khusus Panitia' },
              { id: 'pengawas', label: 'Khusus Pengawas' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTargetScope(tab.id as 'all' | 'panitia' | 'pengawas')}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  targetScope === tab.id
                    ? 'bg-amber-700 text-white'
                    : 'text-slate-600 hover:bg-amber-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10.5px] font-bold">
            Ukuran Aktif: {resolvedPesertaW}×{resolvedPesertaH} mm{' '}
            {isActiveCustom ? '(Kustom)' : '(Otomatis Grid)'}
          </span>
        )}
      </div>

      {/* Role Dimension Badges for Panitia & Pengawas */}
      {mode === 'panitia_pengawas' && (
        <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
          <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-900 font-mono font-bold">
            Panitia: {resolvedPanitiaW}×{resolvedPanitiaH} mm{' '}
            {isValidCardMm(value.panitiaWidthMm, 40) ||
            isValidCardMm(value.panitiaHeightMm, 35) ||
            isValidCardMm(value.sharedWidthMm, 40) ||
            isValidCardMm(value.sharedHeightMm, 35)
              ? '(Kustom)'
              : '(Otomatis)'}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold">
            Pengawas: {resolvedPengawasW}×{resolvedPengawasH} mm{' '}
            {isValidCardMm(value.pengawasWidthMm, 40) ||
            isValidCardMm(value.pengawasHeightMm, 35) ||
            isValidCardMm(value.sharedWidthMm, 40) ||
            isValidCardMm(value.sharedHeightMm, 35)
              ? '(Kustom)'
              : '(Otomatis)'}
          </span>
          <span className="text-slate-500">
            (Grid Otomatis: {autoWidthMm}×{autoHeightMm} mm)
          </span>
        </div>
      )}

      {/* One-Click Presets */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1.5">
          Preset Ukuran Kartu Standar / ID Name Tag:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CARD_DIMENSION_PRESETS.map(preset => {
            const isAutoPreset = preset.widthMm === undefined && preset.heightMm === undefined;
            const isSelected = isAutoPreset
              ? !isActiveCustom
              : isActiveCustom && activeW === preset.widthMm && activeH === preset.heightMm;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDimPatch(preset.widthMm, preset.heightMm)}
                title={preset.desc}
                className={`px-2 py-1 rounded-md border text-[10.5px] font-semibold transition-all text-left ${
                  isSelected
                    ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-800 border-amber-200 hover:border-amber-400 hover:bg-amber-50/70'
                }`}
              >
                <div className="font-bold leading-tight">{preset.label}</div>
                <div
                  className={`text-[9px] leading-tight ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {preset.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders & Exact Number Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 p-2.5 rounded-lg bg-white border border-amber-200/80 items-center">
        {/* Width Control */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center justify-between text-[10.5px]">
            <label className="font-bold text-slate-700">Lebar Kartu (mm)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={40}
                max={250}
                step={0.5}
                value={activeW}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v >= 40) applyWidthOnly(v);
                }}
                className="w-16 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-right bg-slate-50 text-[11px]"
              />
              <span className="font-mono text-[10px] text-slate-500">mm</span>
            </div>
          </div>
          <input
            type="range"
            min={50}
            max={200}
            step={1}
            value={Math.min(200, Math.max(50, activeW))}
            onChange={e => applyWidthOnly(Number(e.target.value))}
            className="w-full accent-amber-700 cursor-pointer"
          />
        </div>

        {/* Height Control */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center justify-between text-[10.5px]">
            <label className="font-bold text-slate-700">Tinggi Kartu (mm)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={35}
                max={250}
                step={0.5}
                value={activeH}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v >= 35) applyHeightOnly(v);
                }}
                className="w-16 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-right bg-slate-50 text-[11px]"
              />
              <span className="font-mono text-[10px] text-slate-500">mm</span>
            </div>
          </div>
          <input
            type="range"
            min={40}
            max={160}
            step={1}
            value={Math.min(160, Math.max(40, activeH))}
            onChange={e => applyHeightOnly(Number(e.target.value))}
            className="w-full accent-amber-700 cursor-pointer"
          />
        </div>

        {/* Swap & Reset */}
        <div className="md:col-span-2 flex md:flex-col gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => applyDimPatch(activeH, activeW)}
            className="px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center gap-1"
            title="Tukar Lebar dan Tinggi (Portrait ↔ Landscape)"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>Tukar L↔T</span>
          </button>
          <button
            type="button"
            onClick={() => applyDimPatch(undefined, undefined)}
            className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[10px] flex items-center justify-center gap-1"
            title="Kembalikan ke ukuran otomatis pas grid kertas"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Otomatis</span>
          </button>
        </div>
      </div>

      {/* Fit Validation Info */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded border text-[10.5px] ${
          overflowW || overflowH
            ? 'bg-rose-50 border-rose-300 text-rose-900'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {overflowW || overflowH ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          )}
          <span>
            Kebutuhan Grid ({cols}×{rowsPerPage}):{' '}
            <strong className="font-mono">
              {usedGridW}×{usedGridH} mm
            </strong>{' '}
            dari area cetak {paperLabel}{' '}
            <strong className="font-mono">
              ({Math.round(printableWidthMm)}×{Math.round(printableHeightMm)} mm)
            </strong>
            {overflowW || overflowH
              ? ' — Melebihi kertas! Kurangi jumlah kolom, kartu/hal, atau aktifkan Orientasi Landscape.'
              : ' — Pas presisi pada halaman cetak (bolak-balik aman).'}
          </span>
        </div>
      </div>

      {/* Cross-card Sync Action */}
      {onApplyToAllCardTypes && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-white/90 border border-amber-200 text-[10.5px]">
          <span className="text-slate-700 font-medium">
            Samakan ukuran lebar & tinggi kartu ke seluruh jenis kartu?
          </span>
          <button
            type="button"
            onClick={onApplyToAllCardTypes}
            className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-bold flex items-center gap-1"
          >
            <CopyCheck className="w-3.5 h-3.5" />
            <span>Terapkan Ukuran ke Kartu Panitia, Pengawas & Siswa</span>
          </button>
        </div>
      )}
    </div>
  );
};

