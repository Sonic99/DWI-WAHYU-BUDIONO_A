import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Guru,
  SchoolProfile,
  StrukturCrossLink,
  StrukturLevelRule,
  StrukturNodeItem,
  StrukturOrganisasiBundle,
  StrukturOrganisasiSettings,
  StrukturRelationType,
  StrukturStafWakaItem,
  Tendik,
  User
} from '../types';
import { appendAuditLog } from '../services/storageService';
import {
  applyAutoLevelFromParent,
  createDefaultStrukturOrganisasiBundle,
  ensureNodeTupoksiDefaults,
  getDefaultTupoksiForJabatan,
  isWakaNode,
  MAX_STAF_WAKA,
  moveNodePosition,
  rebalanceStrukturNodes,
  syncBundleWithMasterGtk,
  wouldCreateCycle
} from '../utils/strukturOrganisasi';
import {
  PrintTypographySettings,
  getPrintTypographyStyleVars,
  getScopedPrintTypographyCss,
  getStoredPrintTypography,
  saveStoredPrintTypography
} from '../utils/printTypography';
import { PrintTypographyBar } from './PrintTypographyBar';
import { OfficialKopSurat } from './OfficialKopSurat';
import { KepalaSekolahSignatureSvg, SchoolStampSvg } from './OfficialStamps';
import { resolveDirectImageUrl } from './ExamCardBarcode';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardList,
  Copy,
  Expand,
  ExternalLink,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Layers,
  Link2,
  Minimize2,
  Network,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users
} from 'lucide-react';

interface StrukturOrganisasiViewProps {
  profile: SchoolProfile;
  currentUser: User;
  guruList: Guru[];
  tendikList: Tendik[];
  bundle: StrukturOrganisasiBundle;
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
  isStandalone?: boolean;
  onUpdateBundle: (next: StrukturOrganisasiBundle) => void;
}

interface NodeBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  right: number;
  bottom: number;
}

interface ComputedSvgConnector {
  key: string;
  d: string;
  relationType: StrukturRelationType;
  label?: string;
  labelX?: number;
  labelY?: number;
  arrowPoints?: string;
  isCrossLink?: boolean;
  junctionDots?: { x: number; y: number }[];
}

const PAPER_DIMS_MM: Record<
  StrukturOrganisasiSettings['paperSize'],
  { width: number; height: number; label: string }
> = {
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  F4: { width: 215, height: 330, label: 'Folio / F4 (215 × 330 mm)' },
  A3: { width: 297, height: 420, label: 'A3 (297 × 420 mm)' }
};

const ACCENT_PALETTE: Record<
  NonNullable<StrukturNodeItem['warnaAccent']>,
  { headerBg: string; headerText: string; border: string; softBg: string; avatarBg: string }
> = {
  navy: {
    headerBg: '#0f172a',
    headerText: '#ffffff',
    border: '#1e3a8a',
    softBg: '#eff6ff',
    avatarBg: '#1e3a8a'
  },
  teal: {
    headerBg: '#115e59',
    headerText: '#ffffff',
    border: '#0f766e',
    softBg: '#f0fdfa',
    avatarBg: '#0f766e'
  },
  emerald: {
    headerBg: '#065f46',
    headerText: '#ffffff',
    border: '#047857',
    softBg: '#ecfdf5',
    avatarBg: '#047857'
  },
  amber: {
    headerBg: '#92400e',
    headerText: '#ffffff',
    border: '#b45309',
    softBg: '#fffbeb',
    avatarBg: '#b45309'
  },
  slate: {
    headerBg: '#334155',
    headerText: '#ffffff',
    border: '#475569',
    softBg: '#f8fafc',
    avatarBg: '#334155'
  },
  rose: {
    headerBg: '#881337',
    headerText: '#ffffff',
    border: '#9f1239',
    softBg: '#fff1f2',
    avatarBg: '#9f1239'
  }
};

// Jarak tetap pada baris bersayap (Komite | Kepsek | KTU, Guru | Staf TU) agar ukuran
// bagan dapat dihitung tepat dan poros tengah tetap sejajar di semua baris.
const WING_CENTER_GAP_PX = 30;
const WING_ITEM_GAP_PX = 12;

const getInitials = (name: string): string => {
  const clean = (name || '')
    .replace(/^(Dr\.|Dra\.|Drs\.|H\.|Hj\.|Ir\.|Prof\.)\s+/gi, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S9';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const compressImageFileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid.'));
      img.onload = () => {
        const maxW = 240;
        const maxH = 300;
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });

const buildArrowHead = (
  x: number,
  y: number,
  dir: 'down' | 'up' | 'left' | 'right',
  size = 5
): string => {
  if (dir === 'down') return `${x},${y} ${x - size},${y - size * 1.45} ${x + size},${y - size * 1.45}`;
  if (dir === 'up') return `${x},${y} ${x - size},${y + size * 1.45} ${x + size},${y + size * 1.45}`;
  if (dir === 'right') return `${x},${y} ${x - size * 1.45},${y - size} ${x - size * 1.45},${y + size}`;
  return `${x},${y} ${x + size * 1.45},${y - size} ${x + size * 1.45},${y + size}`;
};

export const StrukturOrganisasiView: React.FC<StrukturOrganisasiViewProps> = ({
  profile,
  currentUser,
  guruList,
  tendikList,
  bundle,
  fallbackTtdKsUrl,
  fallbackStempelUrl,
  isStandalone = false,
  onUpdateBundle
}) => {
  const [editorTab, setEditorTab] = useState<'susunan' | 'garis' | 'tupoksi' | 'aturan'>('susunan');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    bundle.nodes[0]?.id || 'org-kepsek'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<number | 'ALL'>('ALL');
  const [isFullChartMode, setIsFullChartMode] = useState(false);
  const [previewZoomPct, setPreviewZoomPct] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 45 : 64
  );
  const [typography, setTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography('sman9_struktur_org_typo_v1', {
      fontFamily: 'jakarta',
      lineSpacing: 'nyaman',
      fontScalePct: 100
    })
  );
  const [photoErrors, setPhotoErrors] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // New cross-link form state
  const [newLinkFromId, setNewLinkFromId] = useState<string>(bundle.nodes[0]?.id || '');
  const [newLinkToId, setNewLinkToId] = useState<string>(bundle.nodes[1]?.id || '');
  const [newLinkType, setNewLinkType] = useState<StrukturRelationType>('koordinasi');
  const [newLinkAnchor, setNewLinkAnchor] =
    useState<NonNullable<StrukturCrossLink['anchorStyle']>>('auto');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // DOM Refs for Dynamic SVG Connector Engine & Precision Paper Fit Scaling
  const previewOuterRef = useRef<HTMLDivElement | null>(null);
  const baganHeaderRef = useRef<HTMLDivElement | null>(null);
  const baganFooterRef = useRef<HTMLDivElement | null>(null);
  const chartInnerRef = useRef<HTMLDivElement | null>(null);
  const nodeElementMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [svgSize, setSvgSize] = useState<{ w: number; h: number }>({ w: 1000, h: 650 });
  const [stageMetrics, setStageMetrics] = useState<{
    w: number;
    h: number;
    headerH: number;
    footerH: number;
  }>({ w: 1000, h: 520, headerH: 130, footerH: 95 });
  const [naturalMetrics, setNaturalMetrics] = useState<{
    baseMinW: number;
    baseMinH: number;
    sumPureRowH: number;
    visualRowCount: number;
    leftExt: number;
    rightExt: number;
    rowPureCardsW: Record<string, number>;
    rowCardCounts: Record<string, number>;
    signature: string;
  }>({
    baseMinW: 960,
    baseMinH: 460,
    sumPureRowH: 360,
    visualRowCount: 4,
    leftExt: 458,
    rightExt: 458,
    rowPureCardsW: {},
    rowCardCounts: {},
    signature: ''
  });
  const [svgConnectors, setSvgConnectors] = useState<ComputedSvgConnector[]>([]);

  const { settings, levelRules, nodes, crossLinks } = bundle;
  const modeStruktur = settings.modeStruktur || 'kompleks';
  const marginMm = settings.marginMm ?? 8;
  const autoFitKeKertas = settings.autoFitKeKertas !== false;
  const skalaBaganManualPct = settings.skalaBaganManualPct ?? 90;
  const cetakBagian = settings.cetakBagian || 'semua';
  const tupoksiOrientasi = settings.tupoksiOrientasi || 'portrait';
  const tupoksiLayout = settings.tupoksiLayout || 'tabel_resmi';

  const notify = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice(prev => (prev === msg ? null : prev));
    }, 3600);
  };

  const commitBundle = useCallback(
    (next: StrukturOrganisasiBundle) => {
      onUpdateBundle({
        ...next,
        updatedAt: new Date().toISOString()
      });
    },
    [onUpdateBundle]
  );

  const updateSettings = (patch: Partial<StrukturOrganisasiSettings>) => {
    const nextSettings = { ...settings, ...patch };
    let nextNodes = nodes;
    if (patch.autoSinkronLevelDariAtasan === true) {
      nextNodes = rebalanceStrukturNodes(
        applyAutoLevelFromParent(nodes),
        nextSettings.autoKelompokkanBawahanSejajarAtasan
      );
    } else if (patch.autoKelompokkanBawahanSejajarAtasan === true) {
      nextNodes = rebalanceStrukturNodes(nodes, true);
    }
    commitBundle({
      ...bundle,
      settings: nextSettings,
      nodes: nextNodes
    });
  };

  const activeNodes = useMemo(
    () => nodes.filter(n => n.isActive !== false),
    [nodes]
  );

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) || nodes[0] || null,
    [nodes, selectedNodeId]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, StrukturNodeItem>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  const displayedNodes = useMemo(() => {
    if (modeStruktur === 'kompleks') return activeNodes;
    return activeNodes.filter(
      n => n.parentId === null || n.level === 1 || n.tampilDiSederhana !== false
    );
  }, [activeNodes, modeStruktur]);

  const displayedNodeIds = useMemo(
    () => new Set(displayedNodes.map(n => n.id)),
    [displayedNodes]
  );

  // Preserve visual hierarchy lines cleanly even if an intermediate manager is hidden in Sederhana mode
  const effectiveParentMap = useMemo(() => {
    const map = new Map<string, string | null>();
    displayedNodes.forEach(n => {
      let curr = n.parentId;
      const visited = new Set<string>([n.id]);
      while (curr && !displayedNodeIds.has(curr) && !visited.has(curr)) {
        visited.add(curr);
        curr = nodeMap.get(curr)?.parentId || null;
      }
      map.set(n.id, curr && displayedNodeIds.has(curr) ? curr : null);
    });
    return map;
  }, [displayedNodes, displayedNodeIds, nodeMap]);

  const visibleCrossLinks = useMemo(
    () =>
      crossLinks.filter(
        l => displayedNodeIds.has(l.fromId) && displayedNodeIds.has(l.toId)
      ),
    [crossLinks, displayedNodeIds]
  );

  const sortedNodesForList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...nodes]
      .filter(n => {
        if (filterLevel !== 'ALL' && n.level !== filterLevel) return false;
        if (!q) return true;
        return `${n.jabatan} ${n.nama} ${n.nip} ${n.pangkatGolongan} ${n.bidang || ''}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.level - b.level || a.urutan - b.urutan);
  }, [nodes, searchQuery, filterLevel]);

  const orderedDisplayedNodes = useMemo(() => {
    const sideWeight = (s?: StrukturNodeItem['sidePosition']) =>
      s === 'left' ? -1 : s === 'right' ? 1 : 0;
    return [...displayedNodes].sort(
      (a, b) =>
        a.level - b.level ||
        sideWeight(a.sidePosition) - sideWeight(b.sidePosition) ||
        a.urutan - b.urutan
    );
  }, [displayedNodes]);

  // Distinct displayed levels sorted ascending (1..6)
  const levelGroups = useMemo(() => {
    const map = new Map<number, StrukturNodeItem[]>();
    displayedNodes.forEach(n => {
      const list = map.get(n.level) || [];
      list.push(n);
      map.set(n.level, list);
    });
    const sideWeight = (s?: StrukturNodeItem['sidePosition']) =>
      s === 'left' ? -1 : s === 'right' ? 1 : 0;

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, list]) => {
        const sorted = [...list].sort(
          (a, b) => sideWeight(a.sidePosition) - sideWeight(b.sidePosition) || a.urutan - b.urutan
        );
        const rule =
          levelRules.find(r => r.level === level) || {
            level,
            namaLevel: `Level ${level}`,
            aturanTataLetak: 'grid_seimbang' as const,
            maksKolom: 4,
            tampilkanLabelLevel: false
          };
        return { level, rule, items: sorted };
      });
  }, [displayedNodes, levelRules]);

  // Paper geometry for Bagan & Tupoksi sheets
  const paperGeom = useMemo(() => {
    const base = PAPER_DIMS_MM[settings.paperSize] || PAPER_DIMS_MM.F4;
    const isLand = settings.orientasi === 'landscape';
    const wMm = isLand ? base.height : base.width;
    const hMm = isLand ? base.width : base.height;
    const pageCssSize =
      settings.paperSize === 'F4' ? `${wMm}mm ${hMm}mm` : `${settings.paperSize} ${settings.orientasi}`;
    return { wMm, hMm, label: base.label, pageCssSize };
  }, [settings.paperSize, settings.orientasi]);

  const tupoksiPaperGeom = useMemo(() => {
    const base = PAPER_DIMS_MM[settings.paperSize] || PAPER_DIMS_MM.F4;
    const effectiveOri =
      tupoksiOrientasi === 'sama_bagan' ? settings.orientasi : tupoksiOrientasi;
    const isLand = effectiveOri === 'landscape';
    const wMm = isLand ? base.height : base.width;
    const hMm = isLand ? base.width : base.height;
    const pageCssSize =
      settings.paperSize === 'F4' ? `${wMm}mm ${hMm}mm` : `${settings.paperSize} ${effectiveOri}`;
    return { wMm, hMm, orientation: effectiveOri, label: base.label, pageCssSize };
  }, [settings.paperSize, settings.orientasi, tupoksiOrientasi]);

  const printableAreaPx = useMemo(() => {
    const PX_PER_MM = 96 / 25.4;
    const innerWmm = Math.max(80, paperGeom.wMm - marginMm * 2);
    const innerHmm = Math.max(80, paperGeom.hMm - marginMm * 2);
    return {
      innerWmm,
      innerHmm,
      wPx: Math.round(innerWmm * PX_PER_MM),
      hPx: Math.round(innerHmm * PX_PER_MM)
    };
  }, [paperGeom, marginMm]);

  // Helper to chunk nodes into balanced rows respecting level rule maksKolom
  const splitIntoBalancedRows = useCallback(
    (items: StrukturNodeItem[], rule: StrukturLevelRule): StrukturNodeItem[][] => {
      const maxCols = Math.max(1, rule.maksKolom || 4);
      if (items.length <= maxCols) return [items];
      const rows: StrukturNodeItem[][] = [];
      for (let i = 0; i < items.length; i += maxCols) {
        rows.push(items.slice(i, i + maxCols));
      }
      return rows;
    },
    []
  );

  // Density metrics driven by PrintTypographyBar, Paper Shape & Active Mode
  const densitySpec = useMemo(() => {
    const sp = typography.lineSpacing;
    const scale = (typography.fontScalePct || 100) / 100;
    const nodeCount = displayedNodes.length;
    const isSimple = modeStruktur === 'sederhana';
    const isLandscape = settings.orientasi === 'landscape';
    const paperFactor = settings.paperSize === 'A3' ? 1.06 : 1;
    const denseAutoFactor = (isSimple ? 1.04 : nodeCount > 14 ? 0.92 : 1) * paperFactor;

    const rowGapPx = isLandscape
      ? sp === 'padat'
        ? 20
        : sp === 'lega'
        ? 34
        : 26
      : sp === 'padat'
      ? 26
      : sp === 'lega'
      ? 42
      : 34;
    const colGapPx = sp === 'padat' ? 12 : sp === 'lega' ? 22 : 16;
    const baseCardWidth = isLandscape
      ? sp === 'padat'
        ? 200
        : sp === 'lega'
        ? 228
        : 212
      : sp === 'padat'
      ? 162
      : sp === 'lega'
      ? 184
      : 172;
    const cardWidthPx = baseCardWidth * denseAutoFactor;
    const cardPadPx = sp === 'padat' ? 5 : sp === 'lega' ? 9 : 7;
    const lineHeight = sp === 'padat' ? 1.16 : sp === 'lega' ? 1.4 : 1.24;
    // Ukuran teks dibuat besar agar tetap terbaca jelas setelah bagan diskalakan ke kertas.
    const jabatanPx = 12.5 * scale * denseAutoFactor;
    const namaPx = 12.5 * scale * denseAutoFactor;
    const metaPx = 11 * scale * denseAutoFactor;

    return {
      rowGapPx,
      colGapPx,
      cardWidthPx,
      cardPadPx,
      lineHeight,
      jabatanPx,
      namaPx,
      metaPx
    };
  }, [typography, displayedNodes.length, modeStruktur, settings.orientasi, settings.paperSize]);

  // Precision Full-Page Fit & Automatic Airy Spacing Calculator
  const layoutFitSpec = useMemo(() => {
    const availW = Math.max(300, printableAreaPx.wPx - 4);
    const availH = Math.max(
      220,
      printableAreaPx.hPx - stageMetrics.headerH - stageMetrics.footerH - 8
    );
    const maxScale = settings.paperSize === 'A3' ? 1.38 : 1.18;
    const rawAutoScale = Math.min(
      maxScale,
      availW / Math.max(1, naturalMetrics.baseMinW),
      availH / Math.max(1, naturalMetrics.baseMinH)
    );
    const autoScale = Math.max(
      0.42,
      Math.min(maxScale, Number(rawAutoScale.toFixed(3)))
    );
    const activeScale = autoFitKeKertas
      ? autoScale
      : Math.max(0.45, Math.min(1.35, skalaBaganManualPct / 100));

    // Unscaled canvas matching 100% of printable sheet dimensions at activeScale
    const targetStageW = Math.max(
      naturalMetrics.baseMinW,
      Math.round(availW / Math.max(0.2, activeScale))
    );
    const targetStageH = Math.max(
      naturalMetrics.baseMinH,
      Math.round(availH / Math.max(0.2, activeScale))
    );

    const gapSlotsY = Math.max(1, naturalMetrics.visualRowCount - 1);
    const freeVerticalSpace = Math.max(
      0,
      targetStageH - naturalMetrics.sumPureRowH - 20
    );
    const maxRowGapCap = Math.min(155, Math.max(92, Math.round(densitySpec.rowGapPx * 3.6)));
    const idealRowGap =
      naturalMetrics.visualRowCount > 1
        ? Math.floor(freeVerticalSpace / gapSlotsY)
        : densitySpec.rowGapPx;
    const expandedRowGapPx = Math.max(
      densitySpec.rowGapPx,
      Math.min(maxRowGapCap, idealRowGap)
    );

    const getRowColGapPx = (rowKey: string, itemCount: number): number => {
      if (itemCount <= 1) return densitySpec.colGapPx;
      const pureW = naturalMetrics.rowPureCardsW[rowKey] || 0;
      if (pureW <= 0) return densitySpec.colGapPx;
      // Baris tanpa sayap berpusat di poros; lebarnya dibatasi oleh sisi poros yang paling sempit.
      const extraStageW = Math.max(
        0,
        targetStageW - 44 - (naturalMetrics.leftExt + naturalMetrics.rightExt)
      );
      const halfAvailW =
        Math.min(naturalMetrics.leftExt, naturalMetrics.rightExt) + extraStageW / 2;
      const freeX = Math.max(0, halfAvailW * 2 - pureW);
      const maxColGapCap = Math.min(82, Math.max(40, Math.round(densitySpec.colGapPx * 3.8)));
      return Math.max(
        densitySpec.colGapPx,
        Math.min(maxColGapCap, Math.floor(freeX / (itemCount - 1)))
      );
    };

    const getWingGaps = (
      _rowKey: string,
      _leftCount: number,
      _rightCount: number
    ): { centerGapPx: number; wingItemGapPx: number } => ({
      centerGapPx: WING_CENTER_GAP_PX,
      wingItemGapPx: WING_ITEM_GAP_PX
    });

    return {
      availW,
      availH,
      autoScale,
      activeScale,
      targetStageW,
      targetStageH,
      expandedRowGapPx,
      getRowColGapPx,
      getWingGaps
    };
  }, [
    printableAreaPx,
    stageMetrics.headerH,
    stageMetrics.footerH,
    naturalMetrics,
    densitySpec.rowGapPx,
    densitySpec.colGapPx,
    settings.paperSize,
    autoFitKeKertas,
    skalaBaganManualPct
  ]);

  const precisionAutoScale = layoutFitSpec.autoScale;
  const effectiveChartScale = layoutFitSpec.activeScale;

  const registerNodeEl = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) {
        nodeElementMapRef.current.set(id, el);
      } else {
        nodeElementMapRef.current.delete(id);
      }
    },
    []
  );

  // Measure node bounding boxes & compute orthogonal SVG command + coordination lines
  const recomputeConnectors = useCallback(() => {
    const container = chartInnerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const rawW = container.offsetWidth || containerRect.width;
    const rawH = container.offsetHeight || containerRect.height;
    if (rawW <= 0 || rawH <= 0) return;

    const scaleX = containerRect.width > 0 ? containerRect.width / rawW : 1;
    const scaleY = containerRect.height > 0 ? containerRect.height / rawH : 1;

    const boxes = new Map<string, NodeBox>();
    displayedNodes.forEach(node => {
      const el = nodeElementMapRef.current.get(node.id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const x = (r.left - containerRect.left) / scaleX;
      const y = (r.top - containerRect.top) / scaleY;
      const w = r.width / scaleX;
      const h = r.height / scaleY;
      boxes.set(node.id, {
        id: node.id,
        x,
        y,
        w,
        h,
        cx: x + w / 2,
        cy: y + h / 2,
        right: x + w,
        bottom: y + h
      });
    });

    const headerH = baganHeaderRef.current?.offsetHeight || 0;
    const footerH = baganFooterRef.current?.offsetHeight || 0;
    setStageMetrics(prev => {
      const nextW = Math.round(rawW);
      const nextH = Math.round(rawH);
      if (
        Math.abs(prev.w - nextW) <= 1 &&
        Math.abs(prev.h - nextH) <= 1 &&
        Math.abs(prev.headerH - headerH) <= 1 &&
        Math.abs(prev.footerH - footerH) <= 1
      ) {
        return prev;
      }
      return { w: nextW, h: nextH, headerH, footerH };
    });

    // Compute gap-independent natural card footprint (never causes layout feedback loops)
    let sumPureRowH = 0;
    let visualRowCount = 0;
    let baseMaxRowW = 0;
    const rowPureCardsW: Record<string, number> = {};
    const rowCardCounts: Record<string, number> = {};
    const baseWingGap = WING_ITEM_GAP_PX;
    const baseWingCenterGap = WING_CENTER_GAP_PX;
    // Jarak terjauh ke kiri / kanan dari poros tengah (spine) di seluruh baris.
    // Poros boleh tidak di tengah halaman, supaya sisi kosong tidak memboroskan lebar.
    let maxLeftExt = 0;
    let maxRightExt = 0;

    levelGroups.forEach(({ level, rule, items }) => {
      const leftWings = items.filter(i => i.sidePosition === 'left');
      const rightWings = items.filter(i => i.sidePosition === 'right');
      const centers = items.filter(
        i => i.sidePosition !== 'left' && i.sidePosition !== 'right'
      );
      const hasWingLayout = leftWings.length > 0 || rightWings.length > 0;

      if (hasWingLayout) {
        const allLevelBoxes = items
          .map(i => boxes.get(i.id))
          .filter((b): b is NodeBox => Boolean(b));
        if (allLevelBoxes.length > 0) {
          const lvlTop = Math.min(...allLevelBoxes.map(b => b.y));
          const lvlBottom = Math.max(...allLevelBoxes.map(b => b.bottom));
          sumPureRowH += Math.max(0, lvlBottom - lvlTop);
          visualRowCount += 1;

          const sumW = (arr: StrukturNodeItem[]) =>
            arr.reduce((acc, n) => acc + (boxes.get(n.id)?.w || 0), 0);
          const leftW = sumW(leftWings);
          const rightW = sumW(rightWings);
          const centerW = sumW(centers);
          const leftWithBaseGap =
            leftW + Math.max(0, leftWings.length - 1) * baseWingGap;
          const rightWithBaseGap =
            rightW + Math.max(0, rightWings.length - 1) * baseWingGap;
          const maxWingWithGap = Math.max(leftWithBaseGap, rightWithBaseGap);
          const wingCountMax = Math.max(leftWings.length, rightWings.length);

          const centerBlockW =
            centerW > 0
              ? centerW + Math.max(0, centers.length - 1) * baseWingGap
              : wingCountMax > 0
              ? 40
              : 0;
          const rowLeftExt =
            centerBlockW / 2 + (leftWings.length > 0 ? leftWithBaseGap + baseWingCenterGap : 0);
          const rowRightExt =
            centerBlockW / 2 + (rightWings.length > 0 ? rightWithBaseGap + baseWingCenterGap : 0);
          maxLeftExt = Math.max(maxLeftExt, rowLeftExt);
          maxRightExt = Math.max(maxRightExt, rowRightExt);

          const rowBaseW = rowLeftExt + rowRightExt;

          baseMaxRowW = Math.max(baseMaxRowW, rowBaseW);
          const rowKey = `lvl-${level}-wing`;
          rowPureCardsW[rowKey] =
            Math.max(leftW, rightW) * 2 + (centerW > 0 ? centerW : 40);
          rowCardCounts[rowKey] = Math.max(1, wingCountMax * 2 + centers.length);
        }
      } else {
        const subRows = splitIntoBalancedRows(items, rule);
        subRows.forEach((subItems, subIdx) => {
          const subBoxes = subItems
            .map(i => boxes.get(i.id))
            .filter((b): b is NodeBox => Boolean(b));
          if (subBoxes.length === 0) return;
          const maxH = Math.max(...subBoxes.map(b => b.h));
          const pureCardsW = subBoxes.reduce((acc, b) => acc + b.w, 0);
          const rowBaseW =
            pureCardsW + Math.max(0, subBoxes.length - 1) * densitySpec.colGapPx;

          sumPureRowH += maxH;
          visualRowCount += 1;
          baseMaxRowW = Math.max(baseMaxRowW, rowBaseW);
          maxLeftExt = Math.max(maxLeftExt, rowBaseW / 2);
          maxRightExt = Math.max(maxRightExt, rowBaseW / 2);
          const rowKey = `lvl-${level}-sub-${subIdx}`;
          rowPureCardsW[rowKey] = pureCardsW;
          rowCardCounts[rowKey] = subBoxes.length;
        });
      }
    });

    if (visualRowCount > 0) {
      const nextSumPureRowH = Math.round(sumPureRowH);
      const nextLeftExt = Math.round(maxLeftExt);
      const nextRightExt = Math.round(maxRightExt);
      const nextBaseMinW = Math.max(360, nextLeftExt + nextRightExt + 44);
      const nextBaseMinH = Math.max(
        220,
        Math.round(
          nextSumPureRowH +
            Math.max(0, visualRowCount - 1) * densitySpec.rowGapPx +
            20
        )
      );
      const nextSignature = JSON.stringify({ w: rowPureCardsW, c: rowCardCounts });
      setNaturalMetrics(prev => {
        if (
          Math.abs(prev.baseMinW - nextBaseMinW) <= 1 &&
          Math.abs(prev.baseMinH - nextBaseMinH) <= 1 &&
          Math.abs(prev.sumPureRowH - nextSumPureRowH) <= 1 &&
          prev.visualRowCount === visualRowCount &&
          prev.leftExt === nextLeftExt &&
          prev.rightExt === nextRightExt &&
          prev.signature === nextSignature
        ) {
          return prev;
        }
        return {
          baseMinW: nextBaseMinW,
          baseMinH: nextBaseMinH,
          sumPureRowH: nextSumPureRowH,
          visualRowCount,
          leftExt: nextLeftExt,
          rightExt: nextRightExt,
          rowPureCardsW,
          rowCardCounts,
          signature: nextSignature
        };
      });
    }

    const paths: ComputedSvgConnector[] = [];

    // 1. Hierarchical Parent -> Children Connectors (Perintah / Koordinasi dari Atasan)
    const usedHorizontalBuses: { y: number; minX: number; maxX: number }[] = [];
    const resolveNonOverlappingBusY = (desiredY: number, minX: number, maxX: number): number => {
      let y = desiredY;
      for (let attempt = 0; attempt < 6; attempt++) {
        const collides = usedHorizontalBuses.some(
          b =>
            Math.abs(b.y - y) < 4.5 &&
            Math.min(b.maxX, maxX) > Math.max(b.minX, minX) - 2
        );
        if (!collides) break;
        y -= 6;
      }
      usedHorizontalBuses.push({ y, minX, maxX });
      return y;
    };

    // 1a. Multi-parent converging command lines (e.g. ALL Waka / Staf Waka -> Guru Mata Pelajaran centered below)
    const multiParentHandledIds = new Set<string>();
    displayedNodes.forEach(ch => {
      const cBox = boxes.get(ch.id);
      if (!cBox) return;

      const candidateParentIds: string[] = [];
      if (ch.connectFromAllWaka) {
        displayedNodes.forEach(w => {
          if (w.id !== ch.id && isWakaNode(w) && boxes.has(w.id)) {
            candidateParentIds.push(w.id);
          }
        });
      }
      const effPid = effectiveParentMap.get(ch.id);
      if (effPid && boxes.has(effPid) && !candidateParentIds.includes(effPid)) {
        candidateParentIds.push(effPid);
      }
      if (Array.isArray(ch.additionalParentIds)) {
        ch.additionalParentIds.forEach(pid => {
          if (pid && pid !== ch.id && boxes.has(pid) && !candidateParentIds.includes(pid)) {
            candidateParentIds.push(pid);
          }
        });
      }

      if (candidateParentIds.length < 2) return;

      const parentBoxes = candidateParentIds
        .map(pid => ({ id: pid, box: boxes.get(pid)! }))
        .sort((a, b) => a.box.cx - b.box.cx);

      const maxParentBottom = Math.max(...parentBoxes.map(p => p.box.bottom));
      if (cBox.y < maxParentBottom - 4) return;

      multiParentHandledIds.add(ch.id);

      const gap = Math.max(12, cBox.y - maxParentBottom);
      const rawCollectorY = maxParentBottom + Math.min(26, Math.max(12, gap * 0.42));
      const busLeft = Math.min(cBox.cx, ...parentBoxes.map(p => p.box.cx));
      const busRight = Math.max(cBox.cx, ...parentBoxes.map(p => p.box.cx));
      const collectorY = resolveNonOverlappingBusY(rawCollectorY, busLeft, busRight);

      // Vertical command stems descending from each Waka / Staf Waka down to collector bus
      parentBoxes.forEach(({ id: pid, box: pBox }) => {
        const isInterior = pBox.cx > busLeft + 2 && pBox.cx < busRight - 2;
        paths.push({
          key: `mp-stem-${pid}-${ch.id}`,
          d: `M ${pBox.cx.toFixed(1)} ${pBox.bottom.toFixed(1)} L ${pBox.cx.toFixed(1)} ${collectorY.toFixed(1)}`,
          relationType: ch.relationFromParent,
          junctionDots: isInterior ? [{ x: pBox.cx, y: collectorY }] : undefined
        });
      });

      // Horizontal collector bus uniting all Waka stems
      if (busRight - busLeft > 1) {
        paths.push({
          key: `mp-bus-${ch.id}`,
          d: `M ${busLeft.toFixed(1)} ${collectorY.toFixed(1)} L ${busRight.toFixed(1)} ${collectorY.toFixed(1)}`,
          relationType: ch.relationFromParent
        });
      }

      // Single centered vertical command drop into target node (Guru Mata Pelajaran)
      paths.push({
        key: `mp-drop-${ch.id}`,
        d: `M ${cBox.cx.toFixed(1)} ${collectorY.toFixed(1)} L ${cBox.cx.toFixed(1)} ${cBox.y.toFixed(1)}`,
        relationType: ch.relationFromParent,
        arrowPoints: buildArrowHead(cBox.cx, cBox.y, 'down', 4.4),
        junctionDots: [{ x: cBox.cx, y: collectorY }]
      });
    });

    // 1b. Single-parent hierarchical tree & peer connectors
    const childrenByParent = new Map<string, StrukturNodeItem[]>();
    displayedNodes.forEach(n => {
      if (multiParentHandledIds.has(n.id)) return;
      const resolvedParentId = effectiveParentMap.get(n.id);
      if (!resolvedParentId || !boxes.has(resolvedParentId) || !boxes.has(n.id)) return;
      const arr = childrenByParent.get(resolvedParentId) || [];
      arr.push(n);
      childrenByParent.set(resolvedParentId, arr);
    });

    childrenByParent.forEach((children, parentId) => {
      const pNode = nodeMap.get(parentId);
      const pBox = boxes.get(parentId);
      if (!pNode || !pBox) return;

      // Group children by visual horizontal row (within 24px vertical tolerance)
      const sortedChildren = [...children].sort((a, b) => {
        const ba = boxes.get(a.id)!;
        const bb = boxes.get(b.id)!;
        return ba.y - bb.y || ba.cx - bb.cx;
      });

      // Detect same-row horizontal peers (e.g. Komite Sekolah <-> Kepala Sekolah <-> Koordinator TU on Level 1),
      // below side-wings, and hierarchical tree children below parent.
      const sameRowChildren: StrukturNodeItem[] = [];
      const wingChildren: StrukturNodeItem[] = [];
      const treeChildren: StrukturNodeItem[] = [];

      sortedChildren.forEach(ch => {
        const cBox = boxes.get(ch.id)!;
        const isHorizontallyBeside =
          cBox.right < pBox.x - 4 || cBox.x > pBox.right + 4;
        const hasVerticalOverlap =
          Math.min(pBox.bottom, cBox.bottom) - Math.max(pBox.y, cBox.y) > 12;
        const isSameRow =
          isHorizontallyBeside &&
          (Math.abs(cBox.cy - pBox.cy) < Math.max(pBox.h, cBox.h) * 0.65 ||
            hasVerticalOverlap);
        if (isSameRow) {
          sameRowChildren.push(ch);
          return;
        }
        const isWingLevel = ch.sidePosition === 'left' || ch.sidePosition === 'right';
        const hasSpaceToSpine =
          (ch.sidePosition === 'left' && cBox.right + 12 < pBox.cx) ||
          (ch.sidePosition === 'right' && cBox.x - 12 > pBox.cx);
        const isBelow = cBox.y > pBox.bottom - 4;
        if (isWingLevel && hasSpaceToSpine && isBelow && ch.level === pNode.level + 1) {
          wingChildren.push(ch);
        } else {
          treeChildren.push(ch);
        }
      });

      // Draw same-row / stepped-wing horizontal connectors cleanly connecting facing edges
      sameRowChildren.forEach(sNode => {
        const sBox = boxes.get(sNode.id)!;
        const isLeft = sBox.right < pBox.x;
        const overlapTop = Math.max(pBox.y + 10, sBox.y + 10);
        const overlapBottom = Math.min(pBox.bottom - 10, sBox.bottom - 10);
        const preferredY = (pBox.cy + sBox.cy) / 2;
        const yLine =
          overlapBottom >= overlapTop
            ? Math.max(overlapTop, Math.min(overlapBottom, sBox.cy))
            : preferredY;
        const startX = isLeft ? pBox.x : pBox.right;
        const endX = isLeft ? sBox.right : sBox.x;
        const dir = isLeft ? 'left' : 'right';
        paths.push({
          key: `peer-${parentId}-${sNode.id}`,
          d: `M ${startX.toFixed(1)} ${yLine.toFixed(1)} L ${endX.toFixed(1)} ${yLine.toFixed(1)}`,
          relationType: sNode.relationFromParent,
          arrowPoints: buildArrowHead(endX, yLine, dir, 4.4)
        });
      });

      // Determine deepest Y of all tree children to draw central spine cleanly
      let prevBusY = pBox.bottom;
      let prevLeftGutterX = pBox.cx;

      // Group tree children by level & visual sub-row
      const rowBuckets: { level: number; items: { node: StrukturNodeItem; box: NodeBox }[] }[] = [];
      treeChildren.forEach(ch => {
        const cBox = boxes.get(ch.id)!;
        const existingBucket = rowBuckets.find(
          b => b.level === ch.level && Math.abs(b.items[0].box.y - cBox.y) < 30
        );
        if (existingBucket) {
          existingBucket.items.push({ node: ch, box: cBox });
        } else {
          rowBuckets.push({ level: ch.level, items: [{ node: ch, box: cBox }] });
        }
      });

      rowBuckets.sort((a, b) => a.items[0].box.y - b.items[0].box.y);

      // Draw each sub-row bus cleanly
      rowBuckets.forEach((bucket, bucketIdx) => {
        const items = bucket.items.sort((a, b) => a.box.cx - b.box.cx);
        const minTop = Math.min(...items.map(i => i.box.y));
        const minLeftEdge = Math.min(...items.map(i => i.box.x));
        const minCx = Math.min(pBox.cx, ...items.map(i => i.box.cx));
        const maxCx = Math.max(pBox.cx, ...items.map(i => i.box.cx));

        const activeRowGap = layoutFitSpec.expandedRowGapPx || densitySpec.rowGapPx;
        const rawBusY =
          bucketIdx === 0 && Math.abs(minTop - pBox.bottom) < 60
            ? pBox.bottom + (minTop - pBox.bottom) * 0.5
            : minTop - Math.min(24, Math.max(12, activeRowGap * 0.4));
        const busY = resolveNonOverlappingBusY(rawBusY, minCx, maxCx);

        if (bucketIdx === 0) {
          // Avoid vertical spine crossing over any intermediate-row card (e.g. Koord. TU -> Staf TU around Wakasek row)
          const rowBandBoxes = Array.from(boxes.values()).filter(
            other =>
              other.id !== parentId &&
              !items.some(i => i.node.id === other.id) &&
              other.y >= pBox.bottom - 4 &&
              other.bottom <= busY + 6
          );
          const intermediateBlockers = rowBandBoxes.filter(
            other => other.x - 14 <= pBox.cx && pBox.cx <= other.right + 14
          );

          if (intermediateBlockers.length > 0) {
            const allBoxArr = Array.from(boxes.values());
            const chartMinX = Math.min(...allBoxArr.map(b => b.x));
            const chartMaxX = Math.max(...allBoxArr.map(b => b.right));
            const useRightGutter = pBox.cx >= (chartMinX + chartMaxX) / 2;
            const rightSideBoxes = rowBandBoxes.filter(b => b.right >= pBox.cx - 14);
            const leftSideBoxes = rowBandBoxes.filter(b => b.x <= pBox.cx + 14);
            const maxBlockerRight = Math.max(
              ...rightSideBoxes.map(b => b.right),
              ...intermediateBlockers.map(b => b.right),
              pBox.right
            );
            const minBlockerLeft = Math.min(
              ...leftSideBoxes.map(b => b.x),
              ...intermediateBlockers.map(b => b.x),
              pBox.x
            );
            const gutterX = useRightGutter
              ? maxBlockerRight + 16
              : Math.max(8, minBlockerLeft - 16);
            const exitY = pBox.bottom + Math.min(16, Math.max(10, activeRowGap * 0.3));
            const busStart = Math.min(gutterX, ...items.map(i => i.box.cx));
            const busEnd = Math.max(gutterX, ...items.map(i => i.box.cx));
            const allCoord = items.every(i => i.node.relationFromParent === 'koordinasi');

            paths.push({
              key: `trunk-detour-${parentId}-${bucket.level}`,
              d: `M ${pBox.cx.toFixed(1)} ${pBox.bottom.toFixed(1)} L ${pBox.cx.toFixed(1)} ${exitY.toFixed(1)} L ${gutterX.toFixed(1)} ${exitY.toFixed(1)} L ${gutterX.toFixed(1)} ${busY.toFixed(1)}`,
              relationType: allCoord ? 'koordinasi' : 'perintah',
              junctionDots: [{ x: gutterX, y: busY }]
            });
            if (busEnd - busStart > 1) {
              paths.push({
                key: `bus-${parentId}-${bucket.level}-${bucketIdx}`,
                d: `M ${busStart.toFixed(1)} ${busY.toFixed(1)} L ${busEnd.toFixed(1)} ${busY.toFixed(1)}`,
                relationType: allCoord ? 'koordinasi' : 'perintah'
              });
            }
            prevLeftGutterX = useRightGutter ? Math.max(8, minLeftEdge - 14) : gutterX;
          } else {
            // Standard vertical spine drop from parent bottom center to busY
            paths.push({
              key: `trunk-${parentId}-${bucket.level}`,
              d: `M ${pBox.cx.toFixed(1)} ${pBox.bottom.toFixed(1)} L ${pBox.cx.toFixed(1)} ${busY.toFixed(1)}`,
              relationType:
                items.every(i => i.node.relationFromParent === 'koordinasi')
                  ? 'koordinasi'
                  : 'perintah',
              junctionDots: [{ x: pBox.cx, y: busY }]
            });

            if (items.length > 0 && maxCx - minCx > 1) {
              const allCoord = items.every(i => i.node.relationFromParent === 'koordinasi');
              paths.push({
                key: `bus-${parentId}-${bucket.level}-${bucketIdx}`,
                d: `M ${minCx.toFixed(1)} ${busY.toFixed(1)} L ${maxCx.toFixed(1)} ${busY.toFixed(1)}`,
                relationType: allCoord ? 'koordinasi' : 'perintah'
              });
            }
            prevLeftGutterX = Math.max(8, minLeftEdge - 14);
          }
        } else {
          // Sub-row vertical feeder along left outer gutter from prevBusY down to current busY
          const feederX = Math.min(prevLeftGutterX, Math.max(8, minLeftEdge - 14));
          const subMinCx = Math.min(feederX, ...items.map(i => i.box.cx));
          const subMaxCx = Math.max(feederX, ...items.map(i => i.box.cx));

          // Connect prevBusY left end to feederX if needed
          if (feederX < minCx) {
            paths.push({
              key: `bus-ext-${parentId}-${bucketIdx}`,
              d: `M ${feederX.toFixed(1)} ${prevBusY.toFixed(1)} L ${minCx.toFixed(1)} ${prevBusY.toFixed(1)}`,
              relationType: 'perintah'
            });
          }

          paths.push({
            key: `trunk-sub-${parentId}-${bucketIdx}`,
            d: `M ${feederX.toFixed(1)} ${prevBusY.toFixed(1)} L ${feederX.toFixed(1)} ${busY.toFixed(1)}`,
            relationType: 'perintah',
            junctionDots: [{ x: feederX, y: busY }]
          });

          if (subMaxCx - subMinCx > 1) {
            const allCoord = items.every(i => i.node.relationFromParent === 'koordinasi');
            paths.push({
              key: `bus-${parentId}-${bucket.level}-${bucketIdx}`,
              d: `M ${subMinCx.toFixed(1)} ${busY.toFixed(1)} L ${subMaxCx.toFixed(1)} ${busY.toFixed(1)}`,
              relationType: allCoord ? 'koordinasi' : 'perintah'
            });
          }
        }

        // Vertical drops from busY down to each child card
        items.forEach(({ node: ch, box: cBox }) => {
          const d = `M ${cBox.cx.toFixed(1)} ${busY.toFixed(1)} L ${cBox.cx.toFixed(1)} ${cBox.y.toFixed(1)}`;
          paths.push({
            key: `drop-${parentId}-${ch.id}`,
            d,
            relationType: ch.relationFromParent,
            arrowPoints: buildArrowHead(cBox.cx, cBox.y, 'down', 4.2)
          });
        });

        prevBusY = busY;
      });

      // Draw wing branches (Level 2 Komite Sekolah / KTU branching orthogonally off central spine!)
      if (wingChildren.length > 0) {
        const wingMaxCy = Math.max(...wingChildren.map(w => boxes.get(w.id)!.cy));
        // Ensure spine reaches at least wingMaxCy if no vertical children below
        if (rowBuckets.length === 0) {
          paths.push({
            key: `wing-spine-${parentId}`,
            d: `M ${pBox.cx.toFixed(1)} ${pBox.bottom.toFixed(1)} L ${pBox.cx.toFixed(1)} ${wingMaxCy.toFixed(1)}`,
            relationType: wingChildren.every(w => w.relationFromParent === 'koordinasi')
              ? 'koordinasi'
              : 'perintah'
          });
        }

        wingChildren.forEach(wNode => {
          const wBox = boxes.get(wNode.id)!;
          const isLeft = wBox.right < pBox.cx;
          const targetX = isLeft ? wBox.right : wBox.x;
          const dir = isLeft ? 'left' : 'right';
          paths.push({
            key: `wing-branch-${parentId}-${wNode.id}`,
            d: `M ${pBox.cx.toFixed(1)} ${wBox.cy.toFixed(1)} L ${targetX.toFixed(1)} ${wBox.cy.toFixed(1)}`,
            relationType: wNode.relationFromParent,
            arrowPoints: buildArrowHead(targetX, wBox.cy, dir, 4.2),
            junctionDots: [{ x: pBox.cx, y: wBox.cy }]
          });
        });
      }
    });

    // 2. Cross-Unit Coordination / Extra Command Links
    visibleCrossLinks.forEach((link, idx) => {
      const a = boxes.get(link.fromId);
      const b = boxes.get(link.toId);
      if (!a || !b || link.fromId === link.toId) return;

      const stagger = (idx % 5) * 9;
      const sameRow = Math.abs(a.y - b.y) < 30 || Math.abs(a.cy - b.cy) < 38;
      const anchor = link.anchorStyle || 'auto';

      let d = '';
      let lx = (a.cx + b.cx) / 2;
      let ly = (a.cy + b.cy) / 2;

      if (sameRow && (anchor === 'auto' || anchor === 'side')) {
        const leftBox = a.cx < b.cx ? a : b;
        const rightBox = a.cx < b.cx ? b : a;
        // Check if any other box lies horizontally between leftBox and rightBox on same row
        const hasMiddleBlocker = Array.from(boxes.values()).some(
          other =>
            other.id !== leftBox.id &&
            other.id !== rightBox.id &&
            (Math.abs(other.y - leftBox.y) < 30 || Math.abs(other.cy - leftBox.cy) < 42) &&
            other.right > leftBox.right &&
            other.x < rightBox.x
        );

        if (!hasMiddleBlocker) {
          const yLine = Math.min(leftBox.cy, rightBox.cy) + (idx % 2 === 0 ? -5 : 5);
          d = `M ${leftBox.right.toFixed(1)} ${yLine.toFixed(1)} L ${rightBox.x.toFixed(1)} ${yLine.toFixed(1)}`;
          lx = (leftBox.right + rightBox.x) / 2;
          ly = yLine - 7;
        } else {
          // Route neatly underneath the row corridor
          const corridorY = Math.max(leftBox.bottom, rightBox.bottom) + 12 + stagger;
          d = `M ${leftBox.cx.toFixed(1)} ${leftBox.bottom.toFixed(1)} L ${leftBox.cx.toFixed(1)} ${corridorY.toFixed(1)} L ${rightBox.cx.toFixed(1)} ${corridorY.toFixed(1)} L ${rightBox.cx.toFixed(1)} ${rightBox.bottom.toFixed(1)}`;
          lx = (leftBox.cx + rightBox.cx) / 2;
          ly = corridorY - 6;
        }
      } else if (anchor === 'top') {
        const laneY = Math.min(a.y, b.y) - 14 - stagger;
        d = `M ${a.cx.toFixed(1)} ${a.y.toFixed(1)} L ${a.cx.toFixed(1)} ${laneY.toFixed(1)} L ${b.cx.toFixed(1)} ${laneY.toFixed(1)} L ${b.cx.toFixed(1)} ${b.y.toFixed(1)}`;
        lx = (a.cx + b.cx) / 2;
        ly = laneY - 6;
      } else if (anchor === 'bottom') {
        const laneY = Math.max(a.bottom, b.bottom) + 14 + stagger;
        d = `M ${a.cx.toFixed(1)} ${a.bottom.toFixed(1)} L ${a.cx.toFixed(1)} ${laneY.toFixed(1)} L ${b.cx.toFixed(1)} ${laneY.toFixed(1)} L ${b.cx.toFixed(1)} ${b.bottom.toFixed(1)}`;
        lx = (a.cx + b.cx) / 2;
        ly = laneY - 6;
      } else {
        // Cross-tier auto routing via inter-row corridor (adjacent rows) or outer side gutter (multi-row spans)
        const upperBox = a.cy <= b.cy ? a : b;
        const lowerBox = a.cy <= b.cy ? b : a;
        const verticalSpan = lowerBox.y - upperBox.bottom;

        const activeRowGap = layoutFitSpec.expandedRowGapPx || densitySpec.rowGapPx;
        if (verticalSpan >= 14 && verticalSpan <= activeRowGap + 48) {
          const corridorY = upperBox.bottom + Math.min(12, verticalSpan * 0.32) + (idx % 2) * 5;
          const upperAnchorX = upperBox.cx + (idx % 2 === 0 ? -14 : 14);
          const lowerAnchorX = lowerBox.cx + (upperBox.cx < lowerBox.cx ? -18 : 18);
          d = `M ${upperAnchorX.toFixed(1)} ${upperBox.bottom.toFixed(1)} L ${upperAnchorX.toFixed(1)} ${corridorY.toFixed(1)} L ${lowerAnchorX.toFixed(1)} ${corridorY.toFixed(1)} L ${lowerAnchorX.toFixed(1)} ${lowerBox.y.toFixed(1)}`;
          lx = (upperAnchorX + lowerAnchorX) / 2;
          ly = corridorY - 6;
        } else if (Math.abs(a.cx - b.cx) > 22 && verticalSpan < 14) {
          const aIsLeftOfB = a.cx <= b.cx;
          const startX = aIsLeftOfB ? a.right : a.x;
          const endX = aIsLeftOfB ? b.x : b.right;
          const midX = (startX + endX) / 2 + (idx % 2 === 0 ? -8 : 8);
          d = `M ${startX.toFixed(1)} ${a.cy.toFixed(1)} L ${midX.toFixed(1)} ${a.cy.toFixed(1)} L ${midX.toFixed(1)} ${b.cy.toFixed(1)} L ${endX.toFixed(1)} ${b.cy.toFixed(1)}`;
          lx = midX;
          ly = (a.cy + b.cy) / 2;
        } else {
          // Cards stacked or 2+ tiers apart: route cleanly along right outer gutter
          const gutterOffset = 18 + stagger;
          const exitRight = Math.max(a.right, b.right) + gutterOffset;
          d = `M ${a.right.toFixed(1)} ${a.cy.toFixed(1)} L ${exitRight.toFixed(1)} ${a.cy.toFixed(1)} L ${exitRight.toFixed(1)} ${b.cy.toFixed(1)} L ${b.right.toFixed(1)} ${b.cy.toFixed(1)}`;
          lx = exitRight - 4;
          ly = (a.cy + b.cy) / 2;
        }
      }

      paths.push({
        key: `cross-${link.id}`,
        d,
        relationType: link.relationType,
        label: link.label?.trim() || undefined,
        labelX: lx,
        labelY: ly,
        isCrossLink: true,
        junctionDots: [
          { x: a.cx, y: a.cy },
          { x: b.cx, y: b.cy }
        ].slice(0, 0)
      });
    });

    setSvgSize({ w: Math.round(rawW), h: Math.round(rawH) });
    setSvgConnectors(paths);
  }, [
    displayedNodes,
    levelGroups,
    effectiveParentMap,
    visibleCrossLinks,
    nodeMap,
    densitySpec,
    layoutFitSpec.expandedRowGapPx,
    splitIntoBalancedRows
  ]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      recomputeConnectors();
    });
    return () => cancelAnimationFrame(raf);
  }, [
    recomputeConnectors,
    previewZoomPct,
    isFullChartMode,
    modeStruktur,
    cetakBagian,
    marginMm,
    autoFitKeKertas,
    skalaBaganManualPct,
    effectiveChartScale,
    settings.paperSize,
    settings.orientasi,
    settings.tampilkanFoto,
    settings.tampilkanNip,
    settings.tampilkanPangkat,
    settings.tampilkanBidang,
    settings.tampilkanKopSurat,
    settings.tampilkanLegenda,
    settings.tampilkanTtdKs,
    typography
  ]);

  useEffect(() => {
    const el = chartInnerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => {
      requestAnimationFrame(recomputeConnectors);
    });
    obs.observe(el);
    window.addEventListener('resize', recomputeConnectors);
    window.addEventListener('beforeprint', recomputeConnectors);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', recomputeConnectors);
      window.removeEventListener('beforeprint', recomputeConnectors);
    };
  }, [recomputeConnectors]);

  // Handlers for editing nodes cleanly
  const handleUpdateNode = (id: string, patch: Partial<StrukturNodeItem>) => {
    let nextNodes = nodes.map(n => (n.id === id ? { ...n, ...patch } : n));
    if (patch.parentId !== undefined && settings.autoSinkronLevelDariAtasan) {
      nextNodes = applyAutoLevelFromParent(nextNodes);
    }
    if (
      patch.parentId !== undefined ||
      patch.level !== undefined ||
      patch.sidePosition !== undefined
    ) {
      nextNodes = rebalanceStrukturNodes(
        nextNodes,
        settings.autoKelompokkanBawahanSejajarAtasan
      );
    }
    commitBundle({ ...bundle, nodes: nextNodes });
  };

  const handleMoveNode = (id: string, dir: 'left' | 'right' | 'up' | 'down') => {
    const nextNodes = moveNodePosition(nodes, id, dir);
    commitBundle({ ...bundle, nodes: nextNodes });
  };

  const handleAddNode = (parentId?: string | null) => {
    const parent = parentId ? nodeMap.get(parentId) : undefined;
    const isAddingUnderKtuOrTuWing =
      parent?.id === 'org-ktu' ||
      (parent?.level === 3 && parent?.sidePosition === 'right');
    const targetLevel = isAddingUnderKtuOrTuWing
      ? 3
      : parent
      ? Math.min(6, parent.level + 1)
      : 3;
    const targetSidePosition: StrukturNodeItem['sidePosition'] =
      isAddingUnderKtuOrTuWing ? 'right' : parent?.sidePosition || 'center';
    const resolvedParentId =
      parent?.level === 3 && parent?.sidePosition === 'right' && parent.parentId
        ? parent.parentId
        : parent
        ? parent.id
        : nodes[0]?.id || null;

    const peersCount = nodes.filter(n => n.level === targetLevel).length;
    const newId = `org-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const newJabatan = isAddingUnderKtuOrTuWing
      ? 'Staf Tata Usaha Sekolah'
      : parent
      ? `Koordinator / Staf ${parent.jabatan.replace(/^(Waka |Kepala )/i, '')}`
      : 'Unit Jabatan Baru';
    const newNode: StrukturNodeItem = {
      id: newId,
      jabatan: newJabatan,
      bidang: isAddingUnderKtuOrTuWing
        ? 'Layanan Ketatausahaan'
        : 'Unit Kerja Sekolah',
      nama: 'Nama Pejabat / Guru',
      nip: '-',
      pangkatGolongan: isAddingUnderKtuOrTuWing
        ? 'Staf Administrasi TU'
        : 'Penata (III/c)',
      parentId: resolvedParentId,
      relationFromParent: 'perintah',
      level: targetLevel,
      urutan: peersCount + 1,
      sidePosition: targetSidePosition,
      warnaAccent: parent?.warnaAccent || (isAddingUnderKtuOrTuWing ? 'teal' : 'navy'),
      tampilDiSederhana: isAddingUnderKtuOrTuWing ? false : targetLevel <= 3,
      tupoksi: getDefaultTupoksiForJabatan(newJabatan, newId),
      sourceType: 'manual',
      isActive: true
    };
    const nextNodes = rebalanceStrukturNodes(
      [...nodes, newNode],
      settings.autoKelompokkanBawahanSejajarAtasan
    );
    commitBundle({ ...bundle, nodes: nextNodes });
    setSelectedNodeId(newId);
    setEditorTab('susunan');
    notify('Unit jabatan baru ditambahkan ke struktur & terhubung ke bagan.');
  };

  const handleDeleteNode = (id: string) => {
    if (nodes.length <= 1) {
      notify('Minimal harus tersisa 1 simpul pimpinan utama pada struktur.');
      return;
    }
    const target = nodeMap.get(id);
    const reassigned = nodes
      .filter(n => n.id !== id)
      .map(n =>
        n.parentId === id ? { ...n, parentId: target?.parentId || null } : n
      );
    const cleanedLinks = crossLinks.filter(l => l.fromId !== id && l.toId !== id);
    const rebalanced = rebalanceStrukturNodes(
      settings.autoSinkronLevelDariAtasan
        ? applyAutoLevelFromParent(reassigned)
        : reassigned,
      settings.autoKelompokkanBawahanSejajarAtasan
    );
    commitBundle({
      ...bundle,
      nodes: rebalanced,
      crossLinks: cleanedLinks
    });
    if (selectedNodeId === id && rebalanced[0]) {
      setSelectedNodeId(rebalanced[0].id);
    }
    notify(`Unit "${target?.jabatan || id}" dihapus dan bawahan diselaraskan ulang.`);
  };

  const handleRebalanceAll = () => {
    let nextNodes = [...nodes];
    if (settings.autoSinkronLevelDariAtasan) {
      nextNodes = applyAutoLevelFromParent(nextNodes);
    }
    nextNodes = rebalanceStrukturNodes(nextNodes, true);
    commitBundle({ ...bundle, nodes: nextNodes });
    notify('Urutan & cabang bagan telah dirapikan seimbang anti-garis silang.');
  };

  const handleSyncGtk = () => {
    const synced = syncBundleWithMasterGtk(bundle, profile, guruList, tendikList);
    commitBundle(synced);
    appendAuditLog(
      'SINKRON_STRUKTUR_ORG',
      'Menyinkronkan data Nama, NIP & Pangkat struktur organisasi dengan Master Data GTK.'
    );
    notify('Data Nama, NIP & Pangkat/Golongan berhasil disinkronkan dari Master Guru & Tendik.');
  };

  const handleResetDefault = () => {
    const fresh = createDefaultStrukturOrganisasiBundle(profile, guruList, tendikList);
    commitBundle(fresh);
    setSelectedNodeId(fresh.nodes[0]?.id || 'org-kepsek');
    notify('Struktur Organisasi dikembalikan ke susunan standar resmi SMAN 9 Surabaya.');
  };

  const handleResetAllTupoksi = () => {
    const updated = ensureNodeTupoksiDefaults(
      nodes.map(n => ({
        ...n,
        tupoksi: getDefaultTupoksiForJabatan(n.jabatan, n.id)
      }))
    );
    commitBundle({ ...bundle, nodes: updated });
    notify('Seluruh rincian Tupoksi bidang diperbarui ke standar resmi sekolah.');
  };

  const handleAssignMasterPerson = (nodeId: string, compositeKey: string) => {
    if (!compositeKey) return;
    const [kind, srcId] = compositeKey.split('::');
    if (kind === 'guru') {
      const g = guruList.find(item => item.id === srcId);
      if (!g) return;
      const cleanName =
        g.gelar && !g.nama.toLowerCase().includes(g.gelar.toLowerCase().replace(/[.,]/g, ''))
          ? `${g.nama}, ${g.gelar}`
          : g.nama;
      handleUpdateNode(nodeId, {
        nama: cleanName,
        nip: g.nip || '-',
        pangkatGolongan:
          g.pangkatGolongan && g.pangkatGolongan !== '-' ? g.pangkatGolongan : g.status || '-',
        sourceType: 'guru',
        sourceId: g.id
      });
      notify(`Mengisi data "${cleanName}" dari Master Data Guru.`);
    } else if (kind === 'tendik') {
      const t = tendikList.find(item => item.id === srcId);
      if (!t) return;
      const cleanName =
        t.gelar && !t.nama.toLowerCase().includes(t.gelar.toLowerCase().replace(/[.,]/g, ''))
          ? `${t.nama}, ${t.gelar}`
          : t.nama;
      handleUpdateNode(nodeId, {
        nama: cleanName,
        nip: t.nip || '-',
        pangkatGolongan:
          t.pangkatGolongan && t.pangkatGolongan !== '-' ? t.pangkatGolongan : t.status || '-',
        sourceType: 'tendik',
        sourceId: t.id
      });
      notify(`Mengisi data "${cleanName}" dari Master Data Tendik.`);
    }
  };

  // Handlers for Staf Waka subordinates (up to 5 per Waka node)
  const handleAddStafWaka = (nodeId: string) => {
    const targetNode = nodeMap.get(nodeId);
    if (!targetNode) return;
    const currentStaf = Array.isArray(targetNode.stafWaka) ? targetNode.stafWaka : [];
    if (currentStaf.length >= MAX_STAF_WAKA) {
      notify(`Maksimal ${MAX_STAF_WAKA} orang Staf Waka per bidang.`);
      return;
    }
    const shortBidang = targetNode.jabatan.replace(/^(Waka |Wakil Kepala Sekolah Bidang )/i, '').trim();
    const newStaf: StrukturStafWakaItem = {
      id: `staf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nama: 'Nama Staf Waka',
      nip: '-',
      jabatanStaf: shortBidang ? `Staf ${shortBidang} ${currentStaf.length + 1}` : `Staf Waka ${currentStaf.length + 1}`,
      pangkatGolongan: 'Penata (III/c)',
      fotoUrl: '',
      sourceType: 'manual'
    };
    handleUpdateNode(nodeId, {
      stafWaka: [...currentStaf, newStaf],
      tampilkanStafWaka: true
    });
    notify(`Staf Waka ke-${currentStaf.length + 1} ditambahkan.`);
  };

  const handleUpdateStafWaka = (
    nodeId: string,
    stafId: string,
    patch: Partial<StrukturStafWakaItem>
  ) => {
    const targetNode = nodeMap.get(nodeId);
    if (!targetNode) return;
    const currentStaf = Array.isArray(targetNode.stafWaka) ? targetNode.stafWaka : [];
    handleUpdateNode(nodeId, {
      stafWaka: currentStaf.map(s => (s.id === stafId ? { ...s, ...patch } : s))
    });
  };

  const handleRemoveStafWaka = (nodeId: string, stafId: string) => {
    const targetNode = nodeMap.get(nodeId);
    if (!targetNode) return;
    const currentStaf = Array.isArray(targetNode.stafWaka) ? targetNode.stafWaka : [];
    handleUpdateNode(nodeId, {
      stafWaka: currentStaf.filter(s => s.id !== stafId)
    });
  };

  const handleMoveStafWaka = (nodeId: string, stafId: string, dir: 'up' | 'down') => {
    const targetNode = nodeMap.get(nodeId);
    if (!targetNode) return;
    const currentStaf = [...(Array.isArray(targetNode.stafWaka) ? targetNode.stafWaka : [])];
    const idx = currentStaf.findIndex(s => s.id === stafId);
    if (idx < 0) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= currentStaf.length) return;
    const temp = currentStaf[idx];
    currentStaf[idx] = currentStaf[swapIdx];
    currentStaf[swapIdx] = temp;
    handleUpdateNode(nodeId, { stafWaka: currentStaf });
  };

  const handleAssignMasterStafWaka = (
    nodeId: string,
    stafId: string,
    compositeKey: string
  ) => {
    if (!compositeKey) return;
    const [kind, srcId] = compositeKey.split('::');
    if (kind === 'guru') {
      const g = guruList.find(item => item.id === srcId);
      if (!g) return;
      const cleanName =
        g.gelar && !g.nama.toLowerCase().includes(g.gelar.toLowerCase().replace(/[.,]/g, ''))
          ? `${g.nama}, ${g.gelar}`
          : g.nama;
      handleUpdateStafWaka(nodeId, stafId, {
        nama: cleanName,
        nip: g.nip || '-',
        pangkatGolongan:
          g.pangkatGolongan && g.pangkatGolongan !== '-' ? g.pangkatGolongan : g.status || '-',
        sourceType: 'guru',
        sourceId: g.id
      });
      notify(`Mengisi Staf Waka "${cleanName}" dari Master Guru.`);
    } else if (kind === 'tendik') {
      const t = tendikList.find(item => item.id === srcId);
      if (!t) return;
      const cleanName =
        t.gelar && !t.nama.toLowerCase().includes(t.gelar.toLowerCase().replace(/[.,]/g, ''))
          ? `${t.nama}, ${t.gelar}`
          : t.nama;
      handleUpdateStafWaka(nodeId, stafId, {
        nama: cleanName,
        nip: t.nip || '-',
        pangkatGolongan:
          t.pangkatGolongan && t.pangkatGolongan !== '-' ? t.pangkatGolongan : t.status || '-',
        sourceType: 'tendik',
        sourceId: t.id
      });
      notify(`Mengisi Staf Waka "${cleanName}" dari Master Tendik.`);
    }
  };

  const handleUploadStafWakaPhoto = async (
    nodeId: string,
    stafId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPhotoErrors(prev => ({ ...prev, [`staf::${stafId}`]: false }));
      handleUpdateStafWaka(nodeId, stafId, { fotoUrl: dataUrl });
      notify('Foto Staf Waka berhasil diunggah.');
    } catch {
      notify('Gagal memproses file foto staf. Coba format JPG/PNG lain.');
    }
    e.target.value = '';
  };

  const handleUploadNodePhoto = async (
    nodeId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPhotoErrors(prev => ({ ...prev, [nodeId]: false }));
      handleUpdateNode(nodeId, { fotoUrl: dataUrl });
      notify('Foto profil pejabat berhasil diunggah.');
    } catch {
      notify('Gagal memproses file foto. Coba gunakan format JPG/PNG lain.');
    }
    e.target.value = '';
  };

  const handleAddCrossLink = () => {
    if (!newLinkFromId || !newLinkToId || newLinkFromId === newLinkToId) {
      notify('Pilih dua unit jabatan berbeda untuk dihubungkan.');
      return;
    }
    const newLink: StrukturCrossLink = {
      id: `xlink-${Date.now()}`,
      fromId: newLinkFromId,
      toId: newLinkToId,
      relationType: newLinkType,
      anchorStyle: newLinkAnchor,
      label: newLinkLabel.trim() || undefined
    };
    commitBundle({
      ...bundle,
      crossLinks: [...crossLinks, newLink]
    });
    setNewLinkLabel('');
    notify(
      `Garis ${newLinkType === 'koordinasi' ? 'Koordinasi' : 'Perintah'} ditambahkan ke bagan.`
    );
  };

  const handleFitZoom = useCallback(() => {
    const outerW = previewOuterRef.current?.clientWidth;
    if (!outerW) return;
    const maxSheetMm =
      cetakBagian === 'tupoksi_saja'
        ? tupoksiPaperGeom.wMm
        : cetakBagian === 'bagan_saja'
        ? paperGeom.wMm
        : Math.max(paperGeom.wMm, tupoksiPaperGeom.wMm);
    const sheetPx = (maxSheetMm * 96) / 25.4;
    const fitPct = Math.max(40, Math.min(100, Math.floor(((outerW - 44) / sheetPx) * 100)));
    setPreviewZoomPct(fitPct);
  }, [cetakBagian, paperGeom.wMm, tupoksiPaperGeom.wMm]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      handleFitZoom();
    });
    return () => cancelAnimationFrame(raf);
  }, [handleFitZoom, isFullChartMode]);

  const handlePrint = () => {
    recomputeConnectors();
    appendAuditLog(
      'CETAK_STRUKTUR_ORG',
      `Mencetak Struktur Organisasi ${profile.namaSekolah} (Mode: ${modeStruktur}, Bagian: ${cetakBagian}, Kertas: ${settings.paperSize} ${settings.orientasi}) oleh ${currentUser.name}.`
    );
    window.print();
  };

  const standaloneUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?view=struktur-organisasi`
      : 'https://sman9sby.sch.id/?view=struktur-organisasi';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(standaloneUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const validParentsForSelected = useMemo(() => {
    if (!selectedNode) return [];
    return nodes.filter(
      n => n.id !== selectedNode.id && !wouldCreateCycle(nodes, selectedNode.id, n.id)
    );
  }, [nodes, selectedNode]);

  // Helper: render single org node card cleanly
  const renderOrgCard = (item: StrukturNodeItem, widthOverridePx?: number) => {
    const isSelected = selectedNode?.id === item.id;
    const palette = ACCENT_PALETTE[item.warnaAccent || 'navy'] || ACCENT_PALETTE.navy;
    const isMonokrom = settings.gayaKartu === 'monokrom_cetak';
    const isModern = settings.gayaKartu === 'modern_bersih';
    const resolvedPhoto = resolveDirectImageUrl(item.fotoUrl);
    const hasPhoto = settings.tampilkanFoto && Boolean(resolvedPhoto) && !photoErrors[item.id];
    const effectiveCardWidth = widthOverridePx || densitySpec.cardWidthPx;

    const headerBg = isMonokrom
      ? '#f8fafc'
      : isModern
      ? palette.softBg
      : palette.headerBg;
    const headerText = isMonokrom
      ? '#0f172a'
      : isModern
      ? palette.border
      : palette.headerText;
    const cardBorderColor = isMonokrom ? '#0f172a' : palette.border;

    const stafList =
      isWakaNode(item) && item.tampilkanStafWaka !== false && Array.isArray(item.stafWaka)
        ? item.stafWaka.slice(0, MAX_STAF_WAKA)
        : [];
    const stemColor = isMonokrom ? '#0f172a' : cardBorderColor;

    return (
      <div
        key={item.id}
        ref={registerNodeEl(item.id)}
        data-node-id={item.id}
        className="inline-flex flex-col items-center shrink-0"
      >
        <div
          onClick={() => setSelectedNodeId(item.id)}
          className={`relative bg-white rounded-md cursor-pointer transition-shadow text-left select-none print:cursor-default ${
            isSelected
              ? 'ring-2 ring-blue-500 ring-offset-2 print:ring-0 print:ring-offset-0'
              : 'hover:shadow-md print:shadow-none'
          }`}
          style={{
            width: `${effectiveCardWidth}px`,
            border: `1.5px solid ${cardBorderColor}`,
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)'
          }}
        >
          {/* Top Jabatan Header */}
          <div
            className="px-2.5 py-1.5 border-b text-center"
            style={{
              backgroundColor: headerBg,
              color: headerText,
              borderBottomColor: isMonokrom ? '#0f172a' : `${cardBorderColor}40`
            }}
          >
            <div
              className="font-extrabold uppercase tracking-tight leading-tight"
              style={{ fontSize: `${densitySpec.jabatanPx}px` }}
            >
              {item.jabatan}
            </div>
            {settings.tampilkanBidang && item.bidang && (
              <div
                className="font-semibold opacity-90 mt-0.5 leading-tight break-words"
                style={{ fontSize: `${Math.max(9, densitySpec.metaPx - 0.8)}px` }}
              >
                {item.bidang}
              </div>
            )}
          </div>

          {/* Body: Photo + Identity (Nama, NIP, Pangkat/Golongan) */}
          <div
            className="flex items-start gap-2"
            style={{
              padding: `${densitySpec.cardPadPx}px`,
              lineHeight: densitySpec.lineHeight
            }}
          >
            {settings.tampilkanFoto && hasPhoto && (
              <div
                className="shrink-0 rounded-sm overflow-hidden border flex items-center justify-center font-bold"
                style={{
                  width: '38px',
                  height: '46px',
                  borderColor: `${cardBorderColor}55`,
                  backgroundColor: hasPhoto
                    ? '#f1f5f9'
                    : isMonokrom
                    ? '#e2e8f0'
                    : palette.avatarBg,
                  color: isMonokrom ? '#0f172a' : '#ffffff',
                  fontSize: '12px'
                }}
              >
                {hasPhoto ? (
                  <img
                    src={resolvedPhoto}
                    alt={item.nama}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={() =>
                      setPhotoErrors(prev => ({ ...prev, [item.id]: true }))
                    }
                  />
                ) : (
                  <span>{getInitials(item.nama)}</span>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-0.5">
              <div
                className="font-bold text-slate-950 break-words"
                style={{ fontSize: `${densitySpec.namaPx}px` }}
              >
                {item.nama || '—'}
              </div>

              {settings.tampilkanNip && (
                <div
                  className="font-mono text-slate-800 tabular-nums break-all leading-tight"
                  style={{ fontSize: `${Math.max(9, densitySpec.metaPx - 0.8)}px` }}
                  title={`NIP: ${item.nip || '-'}`}
                >
                  NIP. {item.nip || '-'}
                </div>
              )}

              {settings.tampilkanPangkat && item.pangkatGolongan && (
                <div
                  className="text-slate-700 font-medium break-words leading-tight"
                  style={{ fontSize: `${Math.max(9, densitySpec.metaPx - 0.4)}px` }}
                >
                  {item.pangkatGolongan}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subordinate Staf Waka Connected Block (1–5 staff) */}
        {stafList.length > 0 && (
          <>
            <div className="flex flex-col items-center pointer-events-none select-none">
              <div
                style={{
                  width: '2px',
                  height: settings.orientasi === 'landscape' ? '9px' : '12px',
                  backgroundColor: stemColor
                }}
              />
              <svg width="10" height="6" viewBox="0 0 10 6" className="-mt-0.5">
                <polygon points="1,0 9,0 5,6" fill={stemColor} />
              </svg>
            </div>
            {(() => {
              const useTwoColStaf =
                settings.orientasi === 'landscape' && stafList.length >= 2;
              const stafBoxWidth = useTwoColStaf
                ? Math.round(densitySpec.cardWidthPx * 1.28)
                : densitySpec.cardWidthPx;
              return (
                <div
                  onClick={() => setSelectedNodeId(item.id)}
                  className="bg-white rounded-md cursor-pointer text-left select-none print:cursor-default overflow-hidden"
                  style={{
                    width: `${stafBoxWidth}px`,
                    border: `1.25px solid ${cardBorderColor}`,
                    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <div
                    className="px-2 py-0.5 border-b font-extrabold uppercase tracking-tight flex items-center justify-between"
                    style={{
                      backgroundColor: isMonokrom ? '#f8fafc' : palette.softBg,
                      color: isMonokrom ? '#0f172a' : palette.border,
                      borderBottomColor: isMonokrom ? '#0f172a' : `${cardBorderColor}35`,
                      fontSize: `${Math.max(9, densitySpec.metaPx - 0.5)}px`
                    }}
                  >
                    <span>Staf Waka</span>
                    <span className="font-mono tabular-nums">{stafList.length} org</span>
                  </div>
                  <div
                    className={
                      useTwoColStaf
                        ? 'grid grid-cols-2 divide-x divide-slate-200'
                        : 'divide-y divide-slate-200 px-2 py-1'
                    }
                    style={{ lineHeight: Math.max(1.16, densitySpec.lineHeight - 0.06) }}
                  >
                    {stafList.map((staf, sIdx) => {
                      const stafErrKey = `staf::${staf.id}`;
                      const resolvedStafPhoto = resolveDirectImageUrl(staf.fotoUrl);
                      const hasStafPhoto =
                        settings.tampilkanFoto &&
                        Boolean(resolvedStafPhoto) &&
                        !photoErrors[stafErrKey];

                      return (
                        <div
                          key={staf.id}
                          className={
                            useTwoColStaf
                              ? `p-1.5 flex items-start gap-1 ${
                                  sIdx >= 2 ? 'border-t border-slate-200' : ''
                                } ${
                                  stafList.length % 2 === 1 && sIdx === stafList.length - 1
                                    ? 'col-span-2'
                                    : ''
                                }`
                              : 'py-1.5 first:pt-1 last:pb-1 flex items-start gap-1.5'
                          }
                        >
                          {settings.tampilkanFoto && hasStafPhoto && (
                            <div
                              className="shrink-0 rounded-sm overflow-hidden border flex items-center justify-center font-bold mt-0.5"
                              style={{
                                width: useTwoColStaf ? '22px' : '26px',
                                height: useTwoColStaf ? '27px' : '32px',
                                borderColor: `${cardBorderColor}55`,
                                backgroundColor: hasStafPhoto
                                  ? '#f1f5f9'
                                  : isMonokrom
                                  ? '#e2e8f0'
                                  : palette.avatarBg,
                                color: isMonokrom ? '#0f172a' : '#ffffff',
                                fontSize: '8.5px'
                              }}
                            >
                              {hasStafPhoto ? (
                                <img
                                  src={resolvedStafPhoto}
                                  alt={staf.nama}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={() =>
                                    setPhotoErrors(prev => ({ ...prev, [stafErrKey]: true }))
                                  }
                                />
                              ) : (
                                <span>{getInitials(staf.nama)}</span>
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-0.5">
                            {staf.jabatanStaf && (
                              <div
                                className="font-bold uppercase tracking-tight text-slate-700 break-words leading-tight"
                                style={{
                                  fontSize: `${Math.max(
                                    8.5,
                                    densitySpec.metaPx - (useTwoColStaf ? 1.2 : 0.8)
                                  )}px`
                                }}
                              >
                                <span className="font-mono tabular-nums text-slate-500 mr-0.5">
                                  {sIdx + 1}.
                                </span>
                                {staf.jabatanStaf}
                              </div>
                            )}
                            <div
                              className="font-bold text-slate-950 break-words leading-tight"
                              style={{
                                fontSize: `${Math.max(
                                  9.5,
                                  densitySpec.namaPx - (useTwoColStaf ? 1.2 : 0.6)
                                )}px`
                              }}
                            >
                              {!staf.jabatanStaf && (
                                <span className="font-mono tabular-nums text-slate-500 mr-0.5">
                                  {sIdx + 1}.
                                </span>
                              )}
                              {staf.nama || '—'}
                            </div>
                            {settings.tampilkanNip && (
                              <div
                                className="font-mono text-slate-800 tabular-nums break-all leading-tight"
                                style={{
                                  fontSize: `${Math.max(
                                    8.5,
                                    densitySpec.metaPx - (useTwoColStaf ? 1.2 : 0.9)
                                  )}px`
                                }}
                                title={`NIP: ${staf.nip || '-'}`}
                              >
                                NIP. {staf.nip || '-'}
                              </div>
                            )}
                            {settings.tampilkanPangkat && staf.pangkatGolongan && (
                              <div
                                className="text-slate-600 font-medium break-words leading-tight"
                                style={{
                                  fontSize: `${Math.max(
                                    8.5,
                                    densitySpec.metaPx - (useTwoColStaf ? 1.2 : 0.8)
                                  )}px`
                                }}
                              >
                                {staf.pangkatGolongan}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  const renderBaganSheet = () => {
    const resolvedTtdUrl = settings.ttdKsUrl || fallbackTtdKsUrl;
    const resolvedStempelUrl = settings.stempelUrl || fallbackStempelUrl;
    const isLandscape = settings.orientasi === 'landscape';
    const stageRenderW = Math.max(layoutFitSpec.targetStageW, naturalMetrics.baseMinW);
    const stageRenderH = layoutFitSpec.targetStageH;
    // Poros (spine) bagan tidak harus di tengah halaman: geser tiap baris simetris agar
    // sisi yang kosong tidak ikut memakan lebar kertas.
    const spineExtMax = Math.max(naturalMetrics.leftExt, naturalMetrics.rightExt);
    const rowSymWidthPx = Math.round(spineExtMax * 2);
    const spineShiftPx = Math.round((naturalMetrics.leftExt - naturalMetrics.rightExt) / 2);
    const scaledBoxW = Math.max(200, Math.round(stageRenderW * effectiveChartScale));
    const scaledBoxH = Math.max(
      160,
      Math.round(Math.max(stageMetrics.h, stageRenderH) * effectiveChartScale)
    );

    return (
      <div
        className="struktur-sheet-wrap struktur-bagan-page bg-white text-slate-950 border border-slate-300 shadow-lg mx-auto print:shadow-none print:border-none"
        style={{
          width: `${paperGeom.wMm}mm`,
          height: `${paperGeom.hMm}mm`,
          padding: `${marginMm}mm`,
          boxSizing: 'border-box',
          overflow: 'hidden',
          ...getPrintTypographyStyleVars(typography)
        }}
      >
        <div className="struktur-sheet-scope flex flex-col justify-between h-full">
          {/* Header Block (Measured for exact vertical fit calculation) */}
          <div ref={baganHeaderRef} className="shrink-0">
            {settings.tampilkanKopSurat && (
              <div>
                <OfficialKopSurat profile={profile} compact dense={isLandscape} />
              </div>
            )}

            <div className={`text-center ${isLandscape ? 'mb-1' : 'mb-3'}`}>
              <h1
                className={`${
                  isLandscape ? 'text-[15px]' : 'text-base'
                } font-extrabold tracking-tight text-slate-950 uppercase leading-tight`}
              >
                {settings.judulBagan}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-x-2 text-[11px] font-semibold text-slate-700 leading-tight">
                <span>{settings.subjudulTahun}</span>
                {settings.nomorSk && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-normal text-slate-600">{settings.nomorSk}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Org Chart Canvas inside Full-Page Proportional Viewport */}
          <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
            <div
              className="mx-auto shrink-0 overflow-visible"
              style={{
                width: `${scaledBoxW}px`,
                height: `${scaledBoxH}px`
              }}
            >
              <div
                style={{
                  width: `${stageRenderW}px`,
                  transform: `scale(${effectiveChartScale})`,
                  transformOrigin: 'top left'
                }}
              >
                <div
                  ref={chartInnerRef}
                  className="relative py-2 px-2 flex flex-col justify-center"
                  style={{
                    width: `${stageRenderW}px`,
                    minHeight: `${stageRenderH}px`
                  }}
                >
                  {/* SVG Connector Overlay */}
                  <svg
                    width={svgSize.w}
                    height={svgSize.h}
                    viewBox={`0 0 ${Math.max(1, svgSize.w)} ${Math.max(1, svgSize.h)}`}
                    className="absolute inset-0 pointer-events-none z-0 overflow-visible"
                  >
                    {svgConnectors.map(conn => {
                      const isCoord = conn.relationType === 'koordinasi';
                      const strokeColor =
                        settings.gayaKartu === 'monokrom_cetak'
                          ? isCoord
                            ? '#475569'
                            : '#0f172a'
                          : isCoord
                          ? settings.warnaGarisKoordinasi || '#0284c7'
                          : settings.warnaGarisPerintah || '#0f172a';
                      const strokeW = settings.ketebalanGaris || 2;
                      const dashArr = isCoord ? '6 4' : undefined;

                      return (
                        <g key={conn.key}>
                          <path
                            d={conn.d}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={isCoord ? Math.max(1.5, strokeW - 0.2) : strokeW}
                            strokeDasharray={dashArr}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {conn.arrowPoints && (
                            <polygon
                              points={conn.arrowPoints}
                              fill={isCoord ? '#ffffff' : strokeColor}
                              stroke={strokeColor}
                              strokeWidth={1.3}
                            />
                          )}
                          {conn.junctionDots?.map((pt, dIdx) => (
                            <circle
                              key={`${conn.key}-dot-${dIdx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={2.8}
                              fill={strokeColor}
                            />
                          ))}
                          {conn.label &&
                            typeof conn.labelX === 'number' &&
                            typeof conn.labelY === 'number' && (
                              <g>
                                <rect
                                  x={conn.labelX - Math.min(72, conn.label.length * 2.8 + 8)}
                                  y={conn.labelY - 8}
                                  width={Math.min(144, conn.label.length * 5.6 + 16)}
                                  height={15}
                                  rx={3}
                                  fill="#ffffff"
                                  stroke={strokeColor}
                                  strokeWidth={0.8}
                                />
                                <text
                                  x={conn.labelX}
                                  y={conn.labelY + 2.5}
                                  textAnchor="middle"
                                  fill={strokeColor}
                                  fontSize="8.5"
                                  fontWeight="700"
                                >
                                  {conn.label}
                                </text>
                              </g>
                            )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Hierarchical Level Rows with Auto-Expanded Full-Page Gaps */}
                  <div
                    className="relative z-10 flex flex-col items-center w-full"
                    style={{ rowGap: `${layoutFitSpec.expandedRowGapPx}px` }}
                  >
                    {levelGroups.map(({ level, rule, items }) => {
                      const leftWings = items.filter(i => i.sidePosition === 'left');
                      const rightWings = items.filter(i => i.sidePosition === 'right');
                      const centers = items.filter(
                        i => i.sidePosition !== 'left' && i.sidePosition !== 'right'
                      );

                      const hasWingLayout = leftWings.length > 0 || rightWings.length > 0;

                      return (
                        <div
                          key={`lvl-row-${level}`}
                          style={{
                            width: `${rowSymWidthPx}px`,
                            maxWidth: 'none',
                            position: 'relative',
                            left: `${spineShiftPx}px`
                          }}
                        >
                          {rule.tampilkanLabelLevel && (
                            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                              {rule.namaLevel}
                            </div>
                          )}

                          {hasWingLayout ? (
                            (() => {
                              const isElevatedCenterRow = level === 1 && centers.length > 0;
                              const wingStepPx = isElevatedCenterRow
                                ? isLandscape
                                  ? settings.tampilkanFoto
                                    ? 28
                                    : 20
                                  : settings.tampilkanFoto
                                  ? 36
                                  : 24
                                : 0;
                              const wingPaddingStyle =
                                wingStepPx > 0 ? { paddingTop: `${wingStepPx}px` } : undefined;
                              const maxWingCards = Math.max(leftWings.length, rightWings.length);
                              const wingCardW =
                                maxWingCards >= 3
                                  ? Math.round(densitySpec.cardWidthPx * 0.92)
                                  : maxWingCards === 2
                                  ? Math.round(densitySpec.cardWidthPx * 0.97)
                                  : undefined;
                              const { centerGapPx, wingItemGapPx } = layoutFitSpec.getWingGaps(
                                `lvl-${level}-wing`,
                                leftWings.length,
                                rightWings.length
                              );
                              return (
                                <div
                                  className={`w-full grid grid-cols-[1fr_auto_1fr] ${
                                    isElevatedCenterRow ? 'items-start' : 'items-center'
                                  }`}
                                  style={{ columnGap: `${centerGapPx}px` }}
                                >
                                  <div
                                    className="flex items-start justify-end flex-nowrap"
                                    style={{ ...wingPaddingStyle, gap: `${wingItemGapPx}px` }}
                                  >
                                    {leftWings.map(wItem => renderOrgCard(wItem, wingCardW))}
                                  </div>
                                  <div
                                    className="flex items-start justify-center flex-nowrap"
                                    style={{ gap: `${wingItemGapPx}px` }}
                                  >
                                    {centers.length > 0 ? (
                                      centers.map(cItem => renderOrgCard(cItem))
                                    ) : (
                                      <div aria-hidden="true" className="w-10 h-1" />
                                    )}
                                  </div>
                                  <div
                                    className="flex items-start justify-start flex-nowrap"
                                    style={{ ...wingPaddingStyle, gap: `${wingItemGapPx}px` }}
                                  >
                                    {rightWings.map(wItem => renderOrgCard(wItem, wingCardW))}
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div
                              className="flex flex-col items-center w-full"
                              style={{
                                rowGap: `${Math.max(
                                  18,
                                  Math.round(layoutFitSpec.expandedRowGapPx * 0.72)
                                )}px`
                              }}
                            >
                              {splitIntoBalancedRows(items, rule).map((rowItems, subIdx) => (
                                <div
                                  key={`lvl-${level}-sub-${subIdx}`}
                                  className="w-full flex flex-nowrap items-start justify-center"
                                  style={{
                                    gap: `${layoutFitSpec.getRowColGapPx(
                                      `lvl-${level}-sub-${subIdx}`,
                                      rowItems.length
                                    )}px`
                                  }}
                                >
                                  {rowItems.map(rItem => renderOrgCard(rItem))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Block: Legenda + TTD Kepala Sekolah */}
          <div
            ref={baganFooterRef}
            className={`shrink-0 border-t border-slate-300 flex flex-wrap items-end justify-between gap-3 ${
              isLandscape ? 'mt-1.5 pt-1.5' : 'mt-3 pt-2.5'
            }`}
          >
            {settings.tampilkanLegenda ? (
              <div
                className={`border border-slate-300 rounded-md bg-slate-50/70 text-[10px] ${
                  isLandscape
                    ? 'px-2.5 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1'
                    : 'px-3 py-2 space-y-1'
                }`}
              >
                <div className="font-extrabold uppercase tracking-wide text-slate-900 text-[9.5px]">
                  Keterangan ({modeStruktur === 'sederhana' ? 'Sederhana' : 'Kompleks'}):
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="34" height="10" className="shrink-0">
                    <line
                      x1="0"
                      y1="5"
                      x2="26"
                      y2="5"
                      stroke={
                        settings.gayaKartu === 'monokrom_cetak'
                          ? '#0f172a'
                          : settings.warnaGarisPerintah || '#0f172a'
                      }
                      strokeWidth="2.2"
                    />
                    <polygon
                      points="33,5 26,2 26,8"
                      fill={
                        settings.gayaKartu === 'monokrom_cetak'
                          ? '#0f172a'
                          : settings.warnaGarisPerintah || '#0f172a'
                      }
                    />
                  </svg>
                  <span className="font-semibold text-slate-800">
                    Garis Perintah / Komando
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="34" height="10" className="shrink-0">
                    <line
                      x1="0"
                      y1="5"
                      x2="26"
                      y2="5"
                      stroke={
                        settings.gayaKartu === 'monokrom_cetak'
                          ? '#475569'
                          : settings.warnaGarisKoordinasi || '#0284c7'
                      }
                      strokeWidth="2"
                      strokeDasharray="5 3"
                    />
                    <polygon
                      points="33,5 26,2 26,8"
                      fill="#ffffff"
                      stroke={
                        settings.gayaKartu === 'monokrom_cetak'
                          ? '#475569'
                          : settings.warnaGarisKoordinasi || '#0284c7'
                      }
                      strokeWidth="1.3"
                    />
                  </svg>
                  <span className="font-semibold text-slate-800">
                    Garis Koordinasi / Kemitraan
                  </span>
                </div>
              </div>
            ) : (
              <div />
            )}

            {settings.tampilkanTtdKs && (
              <div
                className={`text-left leading-tight min-w-[215px] ml-auto ${
                  isLandscape ? 'text-[10px]' : 'text-[10.5px]'
                }`}
              >
                <div>
                  {settings.kotaTanggal || 'Surabaya, 15 Juli 2026'}
                  {isLandscape && (
                    <span className="font-bold"> · Kepala {profile.namaSekolah},</span>
                  )}
                </div>
                {!isLandscape && <div className="font-bold">Kepala {profile.namaSekolah},</div>}
                <div
                  className={`relative flex items-center ${
                    isLandscape ? 'h-8 my-0' : 'h-13 my-0.5'
                  }`}
                >
                  {settings.tampilkanStempel && (
                    <div className="absolute -left-4 -top-1 pointer-events-none select-none opacity-85">
                      {resolvedStempelUrl ? (
                        <img
                          src={resolveDirectImageUrl(resolvedStempelUrl)}
                          alt="Stempel Sekolah"
                          className={`${isLandscape ? 'w-10 h-10' : 'w-14 h-14'} object-contain`}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <SchoolStampSvg
                          schoolName={profile.namaSekolah}
                          className={isLandscape ? 'w-10 h-10' : 'w-14 h-14'}
                        />
                      )}
                    </div>
                  )}
                  {resolvedTtdUrl ? (
                    <img
                      src={resolveDirectImageUrl(resolvedTtdUrl)}
                      alt="Tanda Tangan Kepala Sekolah"
                      className={`${isLandscape ? 'h-8' : 'h-11'} object-contain relative z-10 ml-3`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="relative z-10 ml-3">
                      <KepalaSekolahSignatureSvg className={isLandscape ? 'w-16 h-8' : 'w-24 h-11'} />
                    </div>
                  )}
                </div>
                <div className="font-bold underline">
                  {profile.kepalaSekolah || 'Dr. Kasminah, M.Pd.'}
                </div>
                <div className="font-mono text-[9.5px] tabular-nums">
                  NIP. {profile.nipKepalaSekolah || '-'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTupoksiSheet = () => {
    const resolvedTtdUrl = settings.ttdKsUrl || fallbackTtdKsUrl;
    const resolvedStempelUrl = settings.stempelUrl || fallbackStempelUrl;

    return (
      <div
        className="struktur-sheet-wrap struktur-tupoksi-page bg-white text-slate-950 border border-slate-300 shadow-lg mx-auto print:shadow-none print:border-none"
        style={{
          width: `${tupoksiPaperGeom.wMm}mm`,
          minHeight: `${tupoksiPaperGeom.hMm}mm`,
          padding: `${marginMm}mm`,
          boxSizing: 'border-box',
          ...getPrintTypographyStyleVars(typography)
        }}
      >
        <div className="struktur-sheet-scope space-y-4">
          {settings.tampilkanKopDiTupoksi !== false && (
            <OfficialKopSurat profile={profile} compact />
          )}

          {/* Header Lampiran Tupoksi Terpisah */}
          <div className="text-center pb-2.5 border-b-2 border-slate-900">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-950 uppercase">
              {settings.judulTupoksi ||
                'URAIAN TUGAS POKOK DAN FUNGSI (TUPOKSI) MASING-MASING BIDANG'}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-x-2 text-[11px] font-semibold text-slate-700 mt-0.5">
              <span>{settings.subjudulTahun}</span>
              {settings.nomorSk && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-normal text-slate-600">{settings.nomorSk}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-800">
                Cakupan: {modeStruktur === 'sederhana' ? 'Struktur Sederhana' : 'Struktur Kompleks'} ({orderedDisplayedNodes.length} Bidang)
              </span>
            </div>
          </div>

          {tupoksiLayout === 'tabel_resmi' ? (
            <table className="w-full border-collapse border border-slate-800 text-[10.5px] leading-relaxed">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-700 px-2 py-2 text-center w-9 font-bold">
                    No
                  </th>
                  <th className="border border-slate-700 px-2.5 py-2 text-left w-[24%] font-bold">
                    Jabatan &amp; Bidang Kerja
                  </th>
                  <th className="border border-slate-700 px-2.5 py-2 text-left w-[24%] font-bold">
                    Pejabat / NIP / Hubungan
                  </th>
                  <th className="border border-slate-700 px-2.5 py-2 text-left font-bold">
                    Uraian Tugas Pokok dan Fungsi (Tupoksi)
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderedDisplayedNodes.map((node, idx) => {
                  const effParentId = effectiveParentMap.get(node.id);
                  const parentNode = effParentId ? nodeMap.get(effParentId) : null;
                  const cleanedTupoksi = Array.isArray(node.tupoksi)
                    ? node.tupoksi.map(s => s.trim()).filter(Boolean)
                    : [];
                  const tupoksiLines =
                    cleanedTupoksi.length > 0
                      ? cleanedTupoksi
                      : getDefaultTupoksiForJabatan(node.jabatan, node.id);

                  return (
                    <tr
                      key={`tpk-row-${node.id}`}
                      className="align-top even:bg-slate-50/70 break-inside-avoid"
                    >
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold tabular-nums text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        <div className="font-extrabold text-slate-950 uppercase leading-snug">
                          {node.jabatan}
                        </div>
                        {node.bidang && (
                          <div className="text-[9.5px] font-medium text-slate-600 mt-0.5">
                            {node.bidang}
                          </div>
                        )}
                        <div className="text-[9px] font-mono text-slate-500 mt-1 tabular-nums">
                          Level {node.level} · Urutan #{node.urutan}
                        </div>
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        <div className="font-bold text-slate-900">{node.nama || '—'}</div>
                        <div className="font-mono text-[9.5px] text-slate-700 tabular-nums mt-0.5">
                          NIP. {node.nip || '-'}
                        </div>
                        {node.pangkatGolongan && (
                          <div className="text-[9.5px] text-slate-600">
                            {node.pangkatGolongan}
                          </div>
                        )}
                        {(node.connectFromAllWaka || parentNode) && (
                          <div className="text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-200">
                            {node.relationFromParent === 'koordinasi'
                              ? 'Koordinasi dgn: '
                              : 'Bertanggung jawab ke: '}
                            <span className="font-semibold text-slate-700">
                              {node.connectFromAllWaka
                                ? 'Seluruh Waka & Staf Waka'
                                : parentNode?.jabatan}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-2">
                        <ol className="list-decimal pl-4 space-y-1 text-slate-800">
                          {tupoksiLines.map((line, lIdx) => (
                            <li key={lIdx} className="leading-snug">
                              {line}
                            </li>
                          ))}
                        </ol>
                        {isWakaNode(node) &&
                          Array.isArray(node.stafWaka) &&
                          node.stafWaka.length > 0 && (
                            <div className="mt-2 pt-1.5 border-t border-slate-200 text-[9.5px] text-slate-700">
                              <div className="font-bold text-slate-900">
                                Tim Staf Waka ({node.stafWaka.slice(0, MAX_STAF_WAKA).length} orang):
                              </div>
                              <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                                {node.stafWaka.slice(0, MAX_STAF_WAKA).map(staf => (
                                  <li key={staf.id}>
                                    <span className="font-semibold text-slate-900">{staf.nama}</span>
                                    {staf.jabatanStaf ? ` — ${staf.jabatanStaf}` : ''}
                                    {` · NIP. ${staf.nip || '-'}`}
                                    {staf.pangkatGolongan ? ` · ${staf.pangkatGolongan}` : ''}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
              {orderedDisplayedNodes.map((node, idx) => {
                const effParentId = effectiveParentMap.get(node.id);
                const parentNode = effParentId ? nodeMap.get(effParentId) : null;
                const cleanedTupoksi = Array.isArray(node.tupoksi)
                  ? node.tupoksi.map(s => s.trim()).filter(Boolean)
                  : [];
                const tupoksiLines =
                  cleanedTupoksi.length > 0
                    ? cleanedTupoksi
                    : getDefaultTupoksiForJabatan(node.jabatan, node.id);

                return (
                  <div
                    key={`tpk-card-${node.id}`}
                    className="border border-slate-400 rounded-md overflow-hidden break-inside-avoid flex flex-col"
                  >
                    <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between gap-2">
                      <div className="font-extrabold text-[11px] uppercase tracking-tight truncate">
                        {idx + 1}. {node.jabatan}
                      </div>
                      <span className="font-mono text-[9.5px] text-amber-300 shrink-0 tabular-nums">
                        Level {node.level}
                      </span>
                    </div>
                    <div className="p-2.5 text-[10px] space-y-2 flex-1 bg-white">
                      <div className="pb-1.5 border-b border-slate-200 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{node.nama}</div>
                          <div className="font-mono text-[9px] text-slate-600 tabular-nums">
                            NIP. {node.nip || '-'} · {node.pangkatGolongan || '-'}
                          </div>
                        </div>
                        {(node.connectFromAllWaka || parentNode) && (
                          <div className="text-[9px] text-right text-slate-500 shrink-0">
                            Atasan:{' '}
                            <span className="font-semibold text-slate-700">
                              {node.connectFromAllWaka ? 'Semua Waka' : parentNode?.jabatan}
                            </span>
                          </div>
                        )}
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-slate-800 leading-snug">
                        {tupoksiLines.map((line, lIdx) => (
                          <li key={lIdx}>{line}</li>
                        ))}
                      </ol>
                      {isWakaNode(node) &&
                        Array.isArray(node.stafWaka) &&
                        node.stafWaka.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-200 text-[9px] text-slate-700">
                            <div className="font-bold text-slate-900">
                              Tim Staf Waka ({node.stafWaka.slice(0, MAX_STAF_WAKA).length} orang):
                            </div>
                            <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                              {node.stafWaka.slice(0, MAX_STAF_WAKA).map(staf => (
                                <li key={staf.id}>
                                  <span className="font-semibold text-slate-900">{staf.nama}</span>
                                  {staf.jabatanStaf ? ` — ${staf.jabatanStaf}` : ''}
                                  {` · NIP. ${staf.nip || '-'}`}
                                  {staf.pangkatGolongan ? ` · ${staf.pangkatGolongan}` : ''}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Tanda Tangan Pengesahan Lampiran Tupoksi */}
          {settings.tampilkanTtdKs && (
            <div className="pt-4 flex justify-end break-inside-avoid">
              <div className="text-left text-[11px] leading-snug min-w-[235px]">
                <div>{settings.kotaTanggal || 'Surabaya, 15 Juli 2026'}</div>
                <div className="font-bold">Kepala {profile.namaSekolah},</div>
                <div className="relative h-14 flex items-center my-0.5">
                  {settings.tampilkanStempel && (
                    <div className="absolute -left-5 top-0 pointer-events-none select-none opacity-85">
                      {resolvedStempelUrl ? (
                        <img
                          src={resolveDirectImageUrl(resolvedStempelUrl)}
                          alt="Stempel Sekolah"
                          className="w-14 h-14 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <SchoolStampSvg
                          schoolName={profile.namaSekolah}
                          className="w-14 h-14"
                        />
                      )}
                    </div>
                  )}
                  {resolvedTtdUrl ? (
                    <img
                      src={resolveDirectImageUrl(resolvedTtdUrl)}
                      alt="Tanda Tangan Kepala Sekolah"
                      className="h-11 object-contain relative z-10 ml-3"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="relative z-10 ml-3">
                      <KepalaSekolahSignatureSvg className="w-24 h-11" />
                    </div>
                  )}
                </div>
                <div className="font-bold underline">
                  {profile.kepalaSekolah || 'Dr. Kasminah, M.Pd.'}
                </div>
                <div className="font-mono text-[10px] tabular-nums">
                  NIP. {profile.nipKepalaSekolah || '-'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const primaryPageCssSize =
    cetakBagian === 'tupoksi_saja' ? tupoksiPaperGeom.pageCssSize : paperGeom.pageCssSize;
  const useNamedSplitPages =
    cetakBagian === 'semua' && tupoksiPaperGeom.orientation !== settings.orientasi;

  return (
    <div className="space-y-4 print:space-y-0">
      <style>{`
        ${getScopedPrintTypographyCss('.struktur-sheet-scope')}
        @page {
          size: ${primaryPageCssSize};
          margin: ${marginMm}mm;
        }
        ${
          useNamedSplitPages
            ? `
        @page baganPage {
          size: ${paperGeom.pageCssSize};
          margin: ${marginMm}mm;
        }
        @page tupoksiPage {
          size: ${tupoksiPaperGeom.pageCssSize};
          margin: ${marginMm}mm;
        }`
            : ''
        }
        @media print {
          @page {
            size: ${primaryPageCssSize};
            margin: ${marginMm}mm;
          }
          html,
          body {
            font-size: 16px !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .struktur-zoom-wrap {
            zoom: 1 !important;
            transform: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .struktur-sheet-wrap {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .struktur-bagan-page {
            ${useNamedSplitPages ? 'page: baganPage;' : ''}
            width: 100% !important;
            max-width: 100% !important;
            height: ${Math.max(80, printableAreaPx.innerHmm - 0.5)}mm !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .struktur-tupoksi-page {
            ${useNamedSplitPages ? 'page: tupoksiPage;' : ''}
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            ${cetakBagian === 'semua' ? 'break-before: page; page-break-before: always;' : ''}
          }
        }
      `}</style>

      {/* Top Workspace Header */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-slate-900 text-amber-400 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Struktur Organisasi Sekolah, Presisi Cetak &amp; Tupoksi Bidang
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5 tabular-nums">
                <span className="font-semibold text-slate-700">
                  Mode {modeStruktur === 'sederhana' ? 'Sederhana' : 'Kompleks'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{displayedNodes.length} Bidang Ditampilkan</span>
                <span aria-hidden="true">·</span>
                <span>{levelGroups.length} Jenjang Level</span>
                <span aria-hidden="true">·</span>
                <span>{visibleCrossLinks.length} Garis Koordinasi</span>
                <span aria-hidden="true">·</span>
                <span>Skala Presisi Kertas {Math.round(effectiveChartScale * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => updateSettings({ modeStruktur: 'sederhana' })}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  modeStruktur === 'sederhana'
                    ? 'bg-slate-900 text-amber-400 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sederhana
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ modeStruktur: 'kompleks' })}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  modeStruktur === 'kompleks'
                    ? 'bg-slate-900 text-amber-400 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kompleks
              </button>
            </div>
            {isStandalone && (
              <a
                href={typeof window !== 'undefined' ? window.location.origin : '/'}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda TU</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleRebalanceAll}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Rapikan urutan kiri-kanan & selaraskan anak sejajar atasan agar garis penghubung seimbang"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Seimbangkan Bagan</span>
            </button>
            <button
              type="button"
              onClick={handleSyncGtk}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Sinkronkan Nama, NIP & Pangkat terbaru dari Master Data Guru & Tendik"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Sinkron GTK</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullChartMode(v => !v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isFullChartMode
                  ? 'bg-slate-900 text-amber-400 border-slate-900'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isFullChartMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Tampilkan Editor</span>
                </>
              ) : (
                <>
                  <Expand className="w-3.5 h-3.5" />
                  <span>Layar Penuh Bagan</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Struktur</span>
            </button>
          </div>
        </div>

        {/* Shareable Portal Link + Status Notice */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-600 whitespace-nowrap">
              Tautan Bagan Mandiri:
            </span>
            <span className="font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded truncate max-w-[340px] select-all">
              {standaloneUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Salin</span>
                </>
              )}
            </button>
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-slate-600 hover:text-blue-700 rounded"
              title="Buka tampilan portal bagan mandiri"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {statusNotice && (
            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
              {statusNotice}
            </div>
          )}
        </div>
      </div>

      {/* Main Side-by-Side Workspace (Editor Left, Proportional SVG Org Chart Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start print:block print:gap-0">
        {/* LEFT PANEL: Susunan Urutan, Editor Personil, Garis Penghubung & Aturan */}
        {!isFullChartMode && (
          <div className="no-print xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            {/* Segmented Control inside Editor */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-lg text-[11px]">
                {[
                  { id: 'susunan', label: 'Susunan', icon: Users },
                  { id: 'garis', label: 'Garis', icon: GitBranch },
                  { id: 'tupoksi', label: 'Tupoksi', icon: ClipboardList },
                  { id: 'aturan', label: 'Aturan', icon: Sliders }
                ].map(t => {
                  const Icon = t.icon;
                  const active = editorTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEditorTab(t.id as any)}
                      className={`px-1.5 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EDITOR TAB 1: SUSUNAN & PEJABAT */}
            {editorTab === 'susunan' && (
              <div className="p-3.5 space-y-3.5">
                {/* Search, Level Filter & Add Button */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Cari jabatan / nama / NIP..."
                      className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <select
                    value={filterLevel}
                    onChange={e =>
                      setFilterLevel(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                    }
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                  >
                    <option value="ALL">Semua Level</option>
                    {[1, 2, 3, 4, 5, 6].map(l => (
                      <option key={l} value={l}>
                        Level {l}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddNode(selectedNode?.id || null)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
                    title="Tambah jabatan baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Unit</span>
                  </button>
                </div>

                {/* Ordered Node Sequence List */}
                <div className="border border-slate-200 rounded-lg max-h-[240px] overflow-y-auto divide-y divide-slate-100">
                  {sortedNodesForList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Tidak ada unit sesuai saringan.
                    </div>
                  ) : (
                    sortedNodesForList.map(node => {
                      const active = selectedNode?.id === node.id;
                      const parentName = node.parentId ? nodeMap.get(node.parentId)?.jabatan : null;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`px-2.5 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            active ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-mono font-bold text-slate-600 tabular-nums shrink-0">
                                L{node.level}.{node.urutan}
                              </span>
                              <span className="font-bold text-slate-900 truncate">
                                {node.jabatan}
                              </span>
                              {isWakaNode(node) &&
                                Array.isArray(node.stafWaka) &&
                                node.stafWaka.length > 0 && (
                                  <span className="font-mono text-[10px] font-semibold text-blue-700 tabular-nums shrink-0">
                                    · Staf {node.stafWaka.length}/{MAX_STAF_WAKA}
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 truncate">
                              <span className="truncate">{node.nama}</span>
                              {(node.connectFromAllWaka || parentName) && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">
                                    {node.relationFromParent === 'koordinasi' ? '┈' : '─'}{' '}
                                    {node.connectFromAllWaka ? 'Semua Waka / Staf Waka' : parentName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Order Controls */}
                          <div
                            className="flex items-center gap-0.5 shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveNode(node.id, 'left')}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded"
                              title="Geser urutan ke kiri"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveNode(node.id, 'right')}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded"
                              title="Geser urutan ke kanan"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveNode(node.id, 'up')}
                              className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100/70 rounded"
                              title="Naikkan 1 level"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveNode(node.id, 'down')}
                              className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100/70 rounded"
                              title="Turunkan 1 level"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected Node Detail Editor */}
                {selectedNode && (
                  <div className="pt-3 border-t border-slate-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">
                          Edit Unit &amp; Identitas Pejabat
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          Posisi: Level {selectedNode.level} · Urutan #{selectedNode.urutan}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddNode(selectedNode.id)}
                          className="px-2 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap"
                          title="Tambah unit bawahan di bawah jabatan ini"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>+ Bawahan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNode(selectedNode.id)}
                          className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="Hapus unit ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Master Data Autofill */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ambil Nama, NIP &amp; Pangkat dari Master GTK
                      </label>
                      <select
                        value=""
                        onChange={e => handleAssignMasterPerson(selectedNode.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium text-xs"
                      >
                        <option value="">-- Pilih Guru / Tendik SMAN 9 untuk isi otomatis --</option>
                        <optgroup label="Tenaga Pendidik (Guru)">
                          {guruList.map(g => (
                            <option key={g.id} value={`guru::${g.id}`}>
                              {g.nama}
                              {g.gelar ? `, ${g.gelar}` : ''} ({g.nip || 'Non-PNS'})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Tenaga Kependidikan (Tendik / TU)">
                          {tendikList.map(t => (
                            <option key={t.id} value={`tendik::${t.id}`}>
                              {t.nama}
                              {t.gelar ? `, ${t.gelar}` : ''} ({t.nip || 'Honor/PTT'})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Jabatan Struktural
                        </label>
                        <input
                          type="text"
                          value={selectedNode.jabatan}
                          onChange={e =>
                            handleUpdateNode(selectedNode.id, { jabatan: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Bidang / Sub-Unit
                        </label>
                        <input
                          type="text"
                          value={selectedNode.bidang || ''}
                          onChange={e =>
                            handleUpdateNode(selectedNode.id, { bidang: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Lengkap (+ Gelar)
                      </label>
                      <input
                        type="text"
                        value={selectedNode.nama}
                        onChange={e => handleUpdateNode(selectedNode.id, { nama: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          NIP / NI PPPK / NUPTK
                        </label>
                        <input
                          type="text"
                          value={selectedNode.nip}
                          onChange={e =>
                            handleUpdateNode(selectedNode.id, { nip: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Pangkat / Golongan
                        </label>
                        <input
                          type="text"
                          value={selectedNode.pangkatGolongan}
                          onChange={e =>
                            handleUpdateNode(selectedNode.id, {
                              pangkatGolongan: e.target.value
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Photo Editor */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>Foto Pejabat</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-[11px] cursor-pointer flex items-center gap-1 whitespace-nowrap">
                            <Upload className="w-3 h-3 text-blue-600" />
                            <span>Upload Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => handleUploadNodePhoto(selectedNode.id, e)}
                              className="hidden"
                            />
                          </label>
                          {selectedNode.fotoUrl && (
                            <button
                              type="button"
                              onClick={() => handleUpdateNode(selectedNode.id, { fotoUrl: '' })}
                              className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-semibold"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={selectedNode.fotoUrl || ''}
                        onChange={e => {
                          setPhotoErrors(prev => ({ ...prev, [selectedNode.id]: false }));
                          handleUpdateNode(selectedNode.id, { fotoUrl: e.target.value });
                        }}
                        placeholder="Atau tempel URL tautan foto web / Google Drive..."
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                      />
                    </div>

                    {/* Bawahan / Staf Waka Editor (Khusus Unit Waka, maks 5 orang) */}
                    {isWakaNode(selectedNode) && (() => {
                      const stafList = Array.isArray(selectedNode.stafWaka)
                        ? selectedNode.stafWaka
                        : [];
                      const isMaxReached = stafList.length >= MAX_STAF_WAKA;
                      return (
                        <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/40 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                <span>Bawahan / Staf Waka</span>
                                <span className="font-mono text-[11px] font-semibold text-blue-700 tabular-nums">
                                  ({stafList.length}/{MAX_STAF_WAKA})
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-600">
                                Tambahkan hingga 5 staf pelaksana di bawah bidang Waka ini.
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isMaxReached}
                              onClick={() => handleAddStafWaka(selectedNode.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
                              title={
                                isMaxReached
                                  ? `Batas maksimal ${MAX_STAF_WAKA} staf per Waka tercapai`
                                  : 'Tambah Staf Waka baru'
                              }
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isMaxReached ? 'Maks 5 Staf' : 'Tambah Staf'}</span>
                            </button>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedNode.tampilkanStafWaka !== false}
                              onChange={e =>
                                handleUpdateNode(selectedNode.id, {
                                  tampilkanStafWaka: e.target.checked
                                })
                              }
                              className="rounded text-blue-600"
                            />
                            <span className="text-[11px] font-semibold text-slate-700">
                              Tampilkan daftar Staf Waka di bawah kartu pada bagan
                            </span>
                          </label>

                          {stafList.length === 0 ? (
                            <div className="p-2.5 rounded-md border border-dashed border-slate-300 bg-white text-center text-[11px] text-slate-500">
                              Belum ada Staf Waka. Klik &ldquo;Tambah Staf&rdquo; untuk mengisi 1–5 anggota staf.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {stafList.map((staf, sIdx) => (
                                <div
                                  key={staf.id}
                                  className="p-2 rounded-md border border-slate-200 bg-white space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono font-bold text-[11px] text-slate-700 tabular-nums">
                                      Staf #{sIdx + 1}
                                    </span>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={sIdx === 0}
                                        onClick={() =>
                                          handleMoveStafWaka(selectedNode.id, staf.id, 'up')
                                        }
                                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-35"
                                        title="Geser ke atas"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={sIdx === stafList.length - 1}
                                        onClick={() =>
                                          handleMoveStafWaka(selectedNode.id, staf.id, 'down')
                                        }
                                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-35"
                                        title="Geser ke bawah"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveStafWaka(selectedNode.id, staf.id)
                                        }
                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                        title="Hapus staf ini"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <select
                                    value=""
                                    onChange={e =>
                                      handleAssignMasterStafWaka(
                                        selectedNode.id,
                                        staf.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-slate-300 rounded bg-slate-50 text-[11px] font-medium"
                                  >
                                    <option value="">-- Isi cepat dari Master Guru / Tendik --</option>
                                    <optgroup label="Tenaga Pendidik (Guru)">
                                      {guruList.map(g => (
                                        <option key={g.id} value={`guru::${g.id}`}>
                                          {g.nama}
                                          {g.gelar ? `, ${g.gelar}` : ''} ({g.nip || 'Non-PNS'})
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Tenaga Kependidikan (Tendik / TU)">
                                      {tendikList.map(t => (
                                        <option key={t.id} value={`tendik::${t.id}`}>
                                          {t.nama}
                                          {t.gelar ? `, ${t.gelar}` : ''} ({t.nip || 'Honor/PTT'})
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="text"
                                      value={staf.nama}
                                      onChange={e =>
                                        handleUpdateStafWaka(selectedNode.id, staf.id, {
                                          nama: e.target.value
                                        })
                                      }
                                      placeholder="Nama lengkap + gelar"
                                      className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] font-semibold"
                                    />
                                    <input
                                      type="text"
                                      value={staf.nip || ''}
                                      onChange={e =>
                                        handleUpdateStafWaka(selectedNode.id, staf.id, {
                                          nip: e.target.value
                                        })
                                      }
                                      placeholder="NIP / NUPTK (- jika kosong)"
                                      className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] font-mono tabular-nums"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="text"
                                      value={staf.jabatanStaf || ''}
                                      onChange={e =>
                                        handleUpdateStafWaka(selectedNode.id, staf.id, {
                                          jabatanStaf: e.target.value
                                        })
                                      }
                                      placeholder="Jabatan / tugas staf"
                                      className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                                    />
                                    <input
                                      type="text"
                                      value={staf.pangkatGolongan || ''}
                                      onChange={e =>
                                        handleUpdateStafWaka(selectedNode.id, staf.id, {
                                          pangkatGolongan: e.target.value
                                        })
                                      }
                                      placeholder="Pangkat / Golongan (cth: Penata III/c)"
                                      className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                                    />
                                  </div>
                                  {/* Foto Staf Waka */}
                                  <div className="p-1.5 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        {(() => {
                                          const stafPreviewUrl = resolveDirectImageUrl(staf.fotoUrl);
                                          const showPreview =
                                            Boolean(stafPreviewUrl) &&
                                            !photoErrors[`staf::${staf.id}`];
                                          return (
                                            <div className="w-6 h-7 rounded-sm overflow-hidden border border-slate-300 bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700 shrink-0">
                                              {showPreview ? (
                                                <img
                                                  src={stafPreviewUrl}
                                                  alt={staf.nama}
                                                  referrerPolicy="no-referrer"
                                                  className="w-full h-full object-cover"
                                                  onError={() =>
                                                    setPhotoErrors(prev => ({
                                                      ...prev,
                                                      [`staf::${staf.id}`]: true
                                                    }))
                                                  }
                                                />
                                              ) : (
                                                <span>{getInitials(staf.nama)}</span>
                                              )}
                                            </div>
                                          );
                                        })()}
                                        <span className="text-[11px] font-semibold text-slate-700">
                                          Foto Staf
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <label className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-[10.5px] cursor-pointer flex items-center gap-1 whitespace-nowrap">
                                          <Upload className="w-3 h-3 text-blue-600" />
                                          <span>Upload Foto</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e =>
                                              handleUploadStafWakaPhoto(
                                                selectedNode.id,
                                                staf.id,
                                                e
                                              )
                                            }
                                            className="hidden"
                                          />
                                        </label>
                                        {staf.fotoUrl && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateStafWaka(selectedNode.id, staf.id, {
                                                fotoUrl: ''
                                              })
                                            }
                                            className="px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-rose-50 text-rose-700 text-[10.5px] font-semibold"
                                          >
                                            Hapus
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <input
                                      type="text"
                                      value={staf.fotoUrl || ''}
                                      onChange={e => {
                                        setPhotoErrors(prev => ({
                                          ...prev,
                                          [`staf::${staf.id}`]: false
                                        }));
                                        handleUpdateStafWaka(selectedNode.id, staf.id, {
                                          fotoUrl: e.target.value
                                        });
                                      }}
                                      placeholder="Atau tempel URL foto staf (web / Google Drive)..."
                                      className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[10.5px]"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Hierarchy & Line Connection Rules for Selected Node */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Aturan Hubungan &amp; Posisi dalam Bagan</span>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Atasan Langsung / Simpul Induk
                        </label>
                        <select
                          value={selectedNode.parentId || ''}
                          onChange={e =>
                            handleUpdateNode(selectedNode.id, {
                              parentId: e.target.value || null
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="">-- Puncak Tertinggi (Tanpa Atasan) --</option>
                          {validParentsForSelected.map(p => (
                            <option key={p.id} value={p.id}>
                              L{p.level} · {p.jabatan} ({p.nama})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Jenis Garis Penghubung dari Atasan
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                relationFromParent: 'perintah'
                              })
                            }
                            className={`px-2 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                              selectedNode.relationFromParent === 'perintah'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span className="inline-block w-4 border-t-2 border-slate-900" />
                            <span>Garis Perintah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                relationFromParent: 'koordinasi'
                              })
                            }
                            className={`px-2 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                              selectedNode.relationFromParent === 'koordinasi'
                                ? 'bg-white text-sky-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span className="inline-block w-4 border-t-2 border-dashed border-sky-600" />
                            <span>Koordinasi</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Jenjang Level
                          </label>
                          <select
                            value={selectedNode.level}
                            disabled={settings.autoSinkronLevelDariAtasan}
                            onChange={e =>
                              handleUpdateNode(selectedNode.id, {
                                level: Number(e.target.value)
                              })
                            }
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold disabled:opacity-60"
                          >
                            {[1, 2, 3, 4, 5, 6].map(l => (
                              <option key={l} value={l}>
                                Level {l}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Posisi Sayap
                          </label>
                          <select
                            value={selectedNode.sidePosition || 'center'}
                            onChange={e =>
                              handleUpdateNode(selectedNode.id, {
                                sidePosition: e.target.value as StrukturNodeItem['sidePosition']
                              })
                            }
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                          >
                            <option value="center">Tengah (Baris)</option>
                            <option value="left">Sayap Kiri</option>
                            <option value="right">Sayap Kanan</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Warna Kartu
                          </label>
                          <select
                            value={selectedNode.warnaAccent || 'navy'}
                            onChange={e =>
                              handleUpdateNode(selectedNode.id, {
                                warnaAccent: e.target.value as StrukturNodeItem['warnaAccent']
                              })
                            }
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                          >
                            <option value="navy">Biru Resmi</option>
                            <option value="teal">Teal</option>
                            <option value="emerald">Zamrud</option>
                            <option value="amber">Amber Komite</option>
                            <option value="slate">Slate</option>
                            <option value="rose">Marun</option>
                          </select>
                        </div>
                      </div>

                      {!isWakaNode(selectedNode) && selectedNode.level >= 3 && (
                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedNode.connectFromAllWaka === true}
                            onChange={e =>
                              handleUpdateNode(selectedNode.id, {
                                connectFromAllWaka: e.target.checked
                              })
                            }
                            className="rounded text-blue-600"
                          />
                          <span className="text-[11px] font-semibold text-slate-700">
                            Hubungkan ke semua Waka / Staf Waka (konvergensi)
                          </span>
                        </label>
                      )}

                      <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedNode.tampilDiSederhana !== false}
                          onChange={e =>
                            handleUpdateNode(selectedNode.id, {
                              tampilDiSederhana: e.target.checked
                            })
                          }
                          className="rounded text-blue-600"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">
                          Tampilkan unit ini pada Mode Struktur Sederhana
                        </span>
                      </label>
                    </div>

                    {/* Quick Inline Tupoksi Editor */}
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Tupoksi Bidang Ini (1 baris = 1 butir)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNode(selectedNode.id, {
                              tupoksi: getDefaultTupoksiForJabatan(
                                selectedNode.jabatan,
                                selectedNode.id
                              )
                            })
                          }
                          className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10.5px] font-semibold text-slate-700 whitespace-nowrap"
                        >
                          Isi Standar
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={(
                          selectedNode.tupoksi ||
                          getDefaultTupoksiForJabatan(selectedNode.jabatan, selectedNode.id)
                        ).join('\n')}
                        onChange={e =>
                          handleUpdateNode(selectedNode.id, {
                            tupoksi: e.target.value
                              .split('\n')
                              .map(s => s.replace(/^\d+[.)]\s*/, ''))
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-[11px] leading-relaxed"
                        placeholder="Tulis rincian tugas pokok dan fungsi (satu poin per baris)..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EDITOR TAB 2: GARIS KOORDINASI & PERINTAH */}
            {editorTab === 'garis' && (
              <div className="p-3.5 space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-900">
                    Tambah Garis Koordinasi / Perintah Lintas Unit
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Dari Unit</label>
                      <select
                        value={newLinkFromId}
                        onChange={e => setNewLinkFromId(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-medium"
                      >
                        {nodes.map(n => (
                          <option key={n.id} value={n.id}>
                            L{n.level} · {n.jabatan}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ke Unit</label>
                      <select
                        value={newLinkToId}
                        onChange={e => setNewLinkToId(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-medium"
                      >
                        {nodes.map(n => (
                          <option key={n.id} value={n.id}>
                            L{n.level} · {n.jabatan}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Jenis Garis
                      </label>
                      <select
                        value={newLinkType}
                        onChange={e => setNewLinkType(e.target.value as StrukturRelationType)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="koordinasi">Koordinasi (Putus-putus)</option>
                        <option value="perintah">Perintah / Komando (Utuh)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Jalur Rute Garis
                      </label>
                      <select
                        value={newLinkAnchor}
                        onChange={e =>
                          setNewLinkAnchor(
                            e.target.value as NonNullable<StrukturCrossLink['anchorStyle']>
                          )
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="auto">Otomatis Cerdas</option>
                        <option value="bottom">Lewat Koridor Bawah</option>
                        <option value="top">Lewat Koridor Atas</option>
                        <option value="side">Garis Lurus Sejajar</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLinkLabel}
                      onChange={e => setNewLinkLabel(e.target.value)}
                      placeholder="Label garis opsional (mis. Koordinasi Kesiswaan)"
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCrossLink}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>

                {/* Daftar Garis Lintas Unit */}
                <div className="space-y-2">
                  <div className="font-bold text-slate-900">
                    Daftar Garis Lintas Unit ({crossLinks.length})
                  </div>
                  {crossLinks.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                      Belum ada garis koordinasi lintas unit tambahan.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {crossLinks.map(lk => {
                        const fromNode = nodeMap.get(lk.fromId);
                        const toNode = nodeMap.get(lk.toId);
                        return (
                          <div
                            key={lk.id}
                            className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-slate-900 truncate">
                                {fromNode?.jabatan || lk.fromId}{' '}
                                {lk.relationType === 'koordinasi' ? '┈┈' : '━━'}{' '}
                                {toNode?.jabatan || lk.toId}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  commitBundle({
                                    ...bundle,
                                    crossLinks: crossLinks.filter(x => x.id !== lk.id)
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                                title="Hapus garis"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <select
                                value={lk.relationType}
                                onChange={e =>
                                  commitBundle({
                                    ...bundle,
                                    crossLinks: crossLinks.map(x =>
                                      x.id === lk.id
                                        ? {
                                            ...x,
                                            relationType: e.target.value as StrukturRelationType
                                          }
                                        : x
                                    )
                                  })
                                }
                                className="px-2 py-1 border border-slate-200 rounded bg-slate-50 text-[11px] font-semibold"
                              >
                                <option value="koordinasi">Koordinasi (Putus-putus)</option>
                                <option value="perintah">Perintah (Utuh)</option>
                              </select>
                              <select
                                value={lk.anchorStyle || 'auto'}
                                onChange={e =>
                                  commitBundle({
                                    ...bundle,
                                    crossLinks: crossLinks.map(x =>
                                      x.id === lk.id
                                        ? {
                                            ...x,
                                            anchorStyle: e.target
                                              .value as StrukturCrossLink['anchorStyle']
                                          }
                                        : x
                                    )
                                  })
                                }
                                className="px-2 py-1 border border-slate-200 rounded bg-slate-50 text-[11px]"
                              >
                                <option value="auto">Jalur Otomatis</option>
                                <option value="bottom">Lewat Bawah</option>
                                <option value="top">Lewat Atas</option>
                                <option value="side">Sejajar Samping</option>
                              </select>
                            </div>
                            <input
                              type="text"
                              value={lk.label || ''}
                              onChange={e =>
                                commitBundle({
                                  ...bundle,
                                  crossLinks: crossLinks.map(x =>
                                    x.id === lk.id ? { ...x, label: e.target.value } : x
                                  )
                                })
                              }
                              placeholder="Label keterangan garis..."
                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Daftar Hubungan Struktural Atasan -> Bawahan */}
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900">
                    Hubungan Garis Atasan → Bawahan ({nodes.filter(n => n.parentId).length})
                  </div>
                  <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {nodes
                      .filter(n => n.parentId)
                      .map(n => {
                        const parent = nodeMap.get(n.parentId!);
                        return (
                          <div
                            key={`rel-${n.id}`}
                            className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="min-w-0 truncate">
                              <span className="text-slate-500">{parent?.jabatan}</span>{' '}
                              <span className="font-mono font-bold">
                                {n.relationFromParent === 'koordinasi' ? '┈▶' : '━▶'}
                              </span>{' '}
                              <span className="font-semibold text-slate-900">{n.jabatan}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateNode(n.id, {
                                  relationFromParent:
                                    n.relationFromParent === 'perintah'
                                      ? 'koordinasi'
                                      : 'perintah'
                                })
                              }
                              className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-[10px] whitespace-nowrap shrink-0"
                            >
                              {n.relationFromParent === 'perintah' ? 'Perintah' : 'Koordinasi'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* EDITOR TAB 3: TUPOKSI BIDANG & HALAMAN LAMPIRAN TERPISAH */}
            {editorTab === 'tupoksi' && (
              <div className="p-3.5 space-y-3.5 text-xs max-h-[700px] overflow-y-auto">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Layout Print Terpisah Tupoksi Bidang</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetAllTupoksi}
                      className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-[10.5px] font-semibold text-slate-700 whitespace-nowrap"
                    >
                      Isi Standar Semua
                    </button>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Judul Lembar Lampiran Tupoksi
                    </label>
                    <input
                      type="text"
                      value={
                        settings.judulTupoksi ||
                        'URAIAN TUGAS POKOK DAN FUNGSI (TUPOKSI) MASING-MASING BIDANG'
                      }
                      onChange={e => updateSettings({ judulTupoksi: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Format Cetak Tupoksi
                      </label>
                      <select
                        value={tupoksiLayout}
                        onChange={e =>
                          updateSettings({
                            tupoksiLayout: e.target.value as StrukturOrganisasiSettings['tupoksiLayout']
                          })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="tabel_resmi">Tabel Kedinasan Resmi</option>
                        <option value="kartu_2_kolom">Kartu Bidang 2 Kolom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Orientasi Kertas Tupoksi
                      </label>
                      <select
                        value={tupoksiOrientasi}
                        onChange={e =>
                          updateSettings({
                            tupoksiOrientasi: e.target
                              .value as StrukturOrganisasiSettings['tupoksiOrientasi']
                          })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="portrait">Portrait (Berdiri)</option>
                        <option value="landscape">Landscape (Mendatar)</option>
                        <option value="sama_bagan">Ikuti Orientasi Bagan</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tampilkanKopDiTupoksi !== false}
                      onChange={e =>
                        updateSettings({ tampilkanKopDiTupoksi: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-700">
                      Tampilkan Kop Surat Resmi pada Halaman Tupoksi
                    </span>
                  </label>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900">
                      Daftar Tupoksi Bidang Aktif ({orderedDisplayedNodes.length})
                    </span>
                    <span className="text-slate-500 font-medium">
                      Mode: {modeStruktur === 'sederhana' ? 'Sederhana' : 'Kompleks'}
                    </span>
                  </div>
                  {orderedDisplayedNodes.map((node, idx) => (
                    <div
                      key={`tpk-edit-${node.id}`}
                      className={`p-2.5 rounded-lg border space-y-1.5 transition-colors ${
                        selectedNode?.id === node.id
                          ? 'border-blue-400 bg-blue-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className="text-left font-bold text-slate-900 hover:text-blue-700 truncate"
                        >
                          {idx + 1}. {node.jabatan}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNode(node.id, {
                              tupoksi: getDefaultTupoksiForJabatan(node.jabatan, node.id)
                            })
                          }
                          className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold text-slate-600 shrink-0"
                        >
                          Standar
                        </button>
                      </div>
                      <div className="text-[10.5px] text-slate-500 truncate">{node.nama}</div>
                      <textarea
                        rows={3}
                        value={(
                          node.tupoksi ||
                          getDefaultTupoksiForJabatan(node.jabatan, node.id)
                        ).join('\n')}
                        onChange={e =>
                          handleUpdateNode(node.id, {
                            tupoksi: e.target.value
                              .split('\n')
                              .map(s => s.replace(/^\d+[.)]\s*/, ''))
                          })
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white text-[11px] leading-snug"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EDITOR TAB 4: ATURAN URUTAN & PENGATURAN CETAK */}
            {editorTab === 'aturan' && (
              <div className="p-3.5 space-y-4 text-xs max-h-[700px] overflow-y-auto">
                {/* Mode Kompleksitas & Presisi Ukuran Kertas */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mode Struktur &amp; Presisi Ukuran Kertas</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tingkat Kompleksitas Bagan
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateSettings({ modeStruktur: 'sederhana' })}
                        className={`px-2 py-1.5 rounded-md font-semibold text-[11px] ${
                          modeStruktur === 'sederhana'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Struktur Sederhana (Inti)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSettings({ modeStruktur: 'kompleks' })}
                        className={`px-2 py-1.5 rounded-md font-semibold text-[11px] ${
                          modeStruktur === 'kompleks'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Struktur Kompleks (Lengkap)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Margin Cetak Kertas
                      </label>
                      <select
                        value={marginMm}
                        onChange={e => updateSettings({ marginMm: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value={6}>Sempit (6 mm)</option>
                        <option value={8}>Standar Resmi (8 mm)</option>
                        <option value={10}>Sedang (10 mm)</option>
                        <option value={14}>Lebar (14 mm)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Bagian Cetak
                      </label>
                      <select
                        value={cetakBagian}
                        onChange={e =>
                          updateSettings({
                            cetakBagian: e.target
                              .value as StrukturOrganisasiSettings['cetakBagian']
                          })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="semua">Bagan + Tupoksi (2 Hal)</option>
                        <option value="bagan_saja">Bagan Struktur Saja</option>
                        <option value="tupoksi_saja">Lampiran Tupoksi Saja</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={autoFitKeKertas}
                      onChange={e =>
                        updateSettings({ autoFitKeKertas: e.target.checked })
                      }
                      className="rounded text-blue-600 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">
                        Skala Presisi Otomatis Muat 1 Halaman Penuh (
                        {Math.round(precisionAutoScale * 100)}%)
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        Menyesuaikan proporsi bagan secara presisi mengikuti dimensi bersih kertas {settings.paperSize} {settings.orientasi}.
                      </div>
                    </div>
                  </label>

                  {!autoFitKeKertas && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span>Skala Manual Bagan di Kertas</span>
                        <span className="font-mono tabular-nums">{skalaBaganManualPct}%</span>
                      </div>
                      <input
                        type="range"
                        min={45}
                        max={135}
                        step={2}
                        value={skalaBaganManualPct}
                        onChange={e =>
                          updateSettings({ skalaBaganManualPct: Number(e.target.value) })
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>
                  )}
                </div>

                {/* Rule Toggles */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Aturan Hirarki &amp; Penyeimbangan Otomatis</span>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSinkronLevelDariAtasan}
                      onChange={e =>
                        updateSettings({ autoSinkronLevelDariAtasan: e.target.checked })
                      }
                      className="rounded text-blue-600 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">
                        Auto-urut Level mengikuti Atasan (Level = Atasan + 1)
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        Nonaktifkan jika ingin menempatkan Komite Sekolah &amp; Koordinator TU sejajar pada baris Level 1 bersama Kepala Sekolah.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoKelompokkanBawahanSejajarAtasan}
                      onChange={e =>
                        updateSettings({
                          autoKelompokkanBawahanSejajarAtasan: e.target.checked
                        })
                      }
                      className="rounded text-blue-600 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">
                        Kelompokkan urutan anak sejajar atasan (Anti-garis silang)
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        Menjaga posisi kiri-kanan unit bawahan tetap mengikuti urutan atasannya.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Aturan per Level 1-6 */}
                <div className="space-y-2">
                  <div className="font-bold text-slate-900">
                    Aturan Tata Letak &amp; Kolom per Jenjang Level
                  </div>
                  <div className="space-y-2">
                    {levelRules.map(rule => (
                      <div
                        key={`rule-lvl-${rule.level}`}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            Level {rule.level}
                          </span>
                          <label className="flex items-center gap-1 text-[10.5px] font-medium text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.tampilkanLabelLevel}
                              onChange={e =>
                                commitBundle({
                                  ...bundle,
                                  levelRules: levelRules.map(r =>
                                    r.level === rule.level
                                      ? { ...r, tampilkanLabelLevel: e.target.checked }
                                      : r
                                  )
                                })
                              }
                              className="rounded text-blue-600"
                            />
                            <span>Tampilkan Tajuk Baris</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-12 gap-1.5">
                          <input
                            type="text"
                            value={rule.namaLevel}
                            onChange={e =>
                              commitBundle({
                                ...bundle,
                                levelRules: levelRules.map(r =>
                                  r.level === rule.level
                                    ? { ...r, namaLevel: e.target.value }
                                    : r
                                )
                              })
                            }
                            className="col-span-8 px-2 py-1 border border-slate-200 rounded text-[11px] font-medium"
                          />
                          <select
                            value={rule.maksKolom}
                            onChange={e =>
                              commitBundle({
                                ...bundle,
                                levelRules: levelRules.map(r =>
                                  r.level === rule.level
                                    ? { ...r, maksKolom: Number(e.target.value) }
                                    : r
                                )
                              })
                            }
                            className="col-span-4 px-1.5 py-1 border border-slate-200 rounded bg-slate-50 text-[11px] font-semibold"
                            title="Maksimal kartu sejajar dalam 1 baris"
                          >
                            {[1, 2, 3, 4, 5, 6].map(c => (
                              <option key={c} value={c}>
                                Maks {c}/baris
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pengaturan Judul, SK, Kartu & Garis */}
                <div className="pt-2 border-t border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-900">
                    Judul Bagan, Gaya Kartu &amp; Warna Garis
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Judul Bagan</label>
                    <input
                      type="text"
                      value={settings.judulBagan}
                      onChange={e => updateSettings({ judulBagan: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tahun Pelajaran
                      </label>
                      <input
                        type="text"
                        value={settings.subjudulTahun}
                        onChange={e => updateSettings({ subjudulTahun: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Kota &amp; Tanggal
                      </label>
                      <input
                        type="text"
                        value={settings.kotaTanggal}
                        onChange={e => updateSettings({ kotaTanggal: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nomor SK / Dasar Bagan
                    </label>
                    <input
                      type="text"
                      value={settings.nomorSk}
                      onChange={e => updateSettings({ nomorSk: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Gaya Kartu</label>
                      <select
                        value={settings.gayaKartu}
                        onChange={e =>
                          updateSettings({
                            gayaKartu: e.target.value as StrukturOrganisasiSettings['gayaKartu']
                          })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="resmi_klasik">Resmi Kedinasan</option>
                        <option value="modern_bersih">Modern Lembut</option>
                        <option value="monokrom_cetak">Hitam Putih (Hemat Tinta)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tebal Garis
                      </label>
                      <select
                        value={settings.ketebalanGaris}
                        onChange={e =>
                          updateSettings({ ketebalanGaris: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value={1.5}>Tipis (1.5px)</option>
                        <option value={2}>Standar (2px)</option>
                        <option value={2.6}>Tegas (2.6px)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white">
                      <span className="font-semibold text-slate-700">Warna Perintah</span>
                      <input
                        type="color"
                        value={settings.warnaGarisPerintah}
                        onChange={e =>
                          updateSettings({ warnaGarisPerintah: e.target.value })
                        }
                        className="w-7 h-5 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white">
                      <span className="font-semibold text-slate-700">Warna Koordinasi</span>
                      <input
                        type="color"
                        value={settings.warnaGarisKoordinasi}
                        onChange={e =>
                          updateSettings({ warnaGarisKoordinasi: e.target.value })
                        }
                        className="w-7 h-5 cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      { key: 'tampilkanKopSurat', label: 'Kop Surat Resmi' },
                      { key: 'tampilkanFoto', label: 'Foto Pejabat' },
                      { key: 'tampilkanNip', label: 'NIP / NI PPPK' },
                      { key: 'tampilkanPangkat', label: 'Pangkat / Golongan' },
                      { key: 'tampilkanBidang', label: 'Sub-Unit Bidang' },
                      { key: 'tampilkanLegenda', label: 'Legenda Garis' },
                      { key: 'tampilkanTtdKs', label: 'Blok TTD Kepsek' },
                      { key: 'tampilkanStempel', label: 'Stempel Sekolah' }
                    ].map(chk => (
                      <label
                        key={chk.key}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean((settings as any)[chk.key])}
                          onChange={e => updateSettings({ [chk.key]: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span>{chk.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetDefault}
                      className="w-full py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Struktur Standar SMAN 9 Surabaya</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT PANEL: Pratinjau Bagan Proporsional & Siap Cetak */}
        <div
          className={`${
            isFullChartMode ? 'xl:col-span-12' : 'xl:col-span-8'
          } space-y-3 min-w-0 print:col-span-12 print:w-full print:space-y-0`}
        >
          {/* Paper, Complexity Mode, Print Section & Typography Control Bar */}
          <div className="no-print bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Mode Sederhana vs Kompleks */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(
                    [
                      { id: 'sederhana', label: 'Sederhana' },
                      { id: 'kompleks', label: 'Kompleks' }
                    ] as const
                  ).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateSettings({ modeStruktur: m.id })}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 ${
                        modeStruktur === m.id
                          ? 'bg-slate-900 text-amber-400 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Cetak Bagian Selector */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(
                    [
                      { id: 'semua', label: 'Bagan + Tupoksi' },
                      { id: 'bagan_saja', label: 'Bagan Saja' },
                      { id: 'tupoksi_saja', label: 'Tupoksi Saja' }
                    ] as const
                  ).map(part => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => updateSettings({ cetakBagian: part.id })}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 ${
                        cetakBagian === part.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {part.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(['A4', 'F4', 'A3'] as const).map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateSettings({ paperSize: sz })}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 ${
                        settings.paperSize === sz
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(['landscape', 'portrait'] as const).map(ori => (
                    <button
                      key={ori}
                      type="button"
                      onClick={() => updateSettings({ orientasi: ori })}
                      className={`px-2.5 py-1 rounded-md font-semibold capitalize whitespace-nowrap shrink-0 ${
                        settings.orientasi === ori
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ori}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => updateSettings({ autoFitKeKertas: !autoFitKeKertas })}
                  className={`px-2.5 py-1 rounded-lg border font-semibold whitespace-nowrap shrink-0 tabular-nums ${
                    autoFitKeKertas
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Otomatis menyesuaikan skala bagan agar presisi 1 halaman kertas"
                >
                  Presisi Kertas {Math.round(effectiveChartScale * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleFitZoom}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold whitespace-nowrap shrink-0"
                  title="Sesuaikan zoom pratinjau agar pas di lebar layar"
                >
                  Pas Layar
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <PrintTypographyBar
                value={typography}
                onChange={next => {
                  setTypography(next);
                  saveStoredPrintTypography('sman9_struktur_org_typo_v1', next);
                }}
                previewZoomPct={previewZoomPct}
                onPreviewZoomChange={setPreviewZoomPct}
                zoomPresets={[45, 65, 80, 100]}
                compact
              />
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                Bagan: {paperGeom.wMm}×{paperGeom.hMm}mm · Tupoksi: {tupoksiPaperGeom.wMm}×
                {tupoksiPaperGeom.hMm}mm ({tupoksiPaperGeom.orientation})
              </span>
            </div>
          </div>

          {/* Interactive Scrollable Preview Canvas */}
          <div
            ref={previewOuterRef}
            className="bg-slate-200/80 border border-slate-300 rounded-xl p-3 sm:p-5 overflow-auto print:bg-white print:border-none print:p-0 print:overflow-visible"
          >
            <div className="no-print text-[11px] font-medium text-slate-600 mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span>
                Klik kartu jabatan pada bagan untuk mengedit pejabat, foto, garis, atau tupoksinya.
              </span>
              <span className="font-mono tabular-nums">
                {paperGeom.label} · Margin {marginMm}mm · Skala Bagan {Math.round(effectiveChartScale * 100)}%
              </span>
            </div>

            <div
              className="struktur-zoom-wrap w-fit mx-auto space-y-6 print:space-y-0 print:w-full print:mx-0"
              style={{ zoom: previewZoomPct / 100 }}
            >
              {cetakBagian !== 'tupoksi_saja' && renderBaganSheet()}

              {cetakBagian === 'semua' && (
                <div className="no-print flex items-center justify-center gap-3 py-1 text-xs font-bold text-slate-600">
                  <span className="h-px flex-1 bg-slate-400/70" />
                  <span className="px-3 py-1 rounded-md bg-white border border-slate-300 shadow-2xs">
                    Halaman Terpisah Saat Print · Lampiran Tupoksi Bidang ({tupoksiPaperGeom.orientation === 'landscape' ? 'Landscape' : 'Portrait'})
                  </span>
                  <span className="h-px flex-1 bg-slate-400/70" />
                </div>
              )}

              {cetakBagian !== 'bagan_saja' && renderTupoksiSheet()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
