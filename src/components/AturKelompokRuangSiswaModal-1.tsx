import React, { useEffect, useMemo, useState } from 'react';
import { KartuUjianSettings, Siswa } from '../types';
import {
  computeMatchedRoomDistribution,
  extractRoomOrderNumber,
  extractTingkatFromKelas,
  formatRoomDisplayLabel
} from '../utils/examRoomSync';
import {
  ArrowRightLeft,
  Check,
  CheckSquare,
  DoorOpen,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  Square,
  UserPlus,
  Users,
  X
} from 'lucide-react';

interface AturKelompokRuangSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaList: Siswa[];
  ujianSettings: KartuUjianSettings;
  initialSelectedRoom?: string;
  onSaveSiswa: (updatedSiswaList: Siswa[], summaryMessage: string) => void;
  onUpdateUjianSettings?: (next: KartuUjianSettings) => void;
}

type GroupingPattern =
  | 'sequential'
  | 'per_tingkat'
  | 'per_kelas'
  | 'campur_silang'
  | 'per_sesi';

interface DraftStudentSlot {
  ruangUjian: string;
  sesiUjian: string;
  nomorUjian: string;
}

const resolveAwalNopes10 = (raw?: string): string => {
  const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '2627101001';
  if (clean.length === 10) return clean;
  if (clean.length > 10) return clean.slice(0, 7) + clean.slice(-3);
  return `${clean}${'1'.padStart(10 - clean.length, '0')}`;
};

const formatNopes10 = (awalNopes: string, indexZeroBased: number): string => {
  const baseStr = resolveAwalNopes10(awalNopes);
  const offset = Math.max(0, Math.floor(indexZeroBased));
  const trailingMatch = baseStr.match(/^(.*?)(\d+)$/);
  if (trailingMatch) {
    const [, head, numStr] = trailingMatch;
    const nextNum = BigInt(numStr) + BigInt(offset);
    const nextStr = nextNum.toString().padStart(numStr.length, '0');
    const headKeep = Math.max(0, 10 - nextStr.length);
    return `${head.slice(0, headKeep)}${nextStr}`.slice(-10).padStart(10, '0');
  }
  const seqWidth = Math.max(3, String(offset + 1).length);
  const seqStr = String(offset + 1).padStart(seqWidth, '0');
  return `${baseStr.slice(0, Math.max(0, 10 - seqStr.length))}${seqStr}`.slice(0, 10);
};

export const AturKelompokRuangSiswaModal: React.FC<AturKelompokRuangSiswaModalProps> = ({
  isOpen,
  onClose,
  siswaList,
  ujianSettings,
  initialSelectedRoom,
  onSaveSiswa,
  onUpdateUjianSettings
}) => {
  const activeSiswa = useMemo(
    () =>
      siswaList
        .filter(s => s.status === 'Aktif' || !s.status)
        .sort(
          (a, b) =>
            (a.rombelSaatIni || a.kelas || '').localeCompare(b.rombelSaatIni || b.kelas || '') ||
            a.nama.localeCompare(b.nama)
        ),
    [siswaList]
  );

  const initialComputed = useMemo(
    () => computeMatchedRoomDistribution(siswaList, ujianSettings),
    [siswaList, ujianSettings]
  );

  // Draft map keyed by student ID
  const [draftMap, setDraftMap] = useState<Record<string, DraftStudentSlot>>({});
  const [customEmptyRooms, setCustomEmptyRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [rightPaneMode, setRightPaneMode] = useState<'members' | 'pull'>('members');
  const [roomSearch, setRoomSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [checkedMemberIds, setCheckedMemberIds] = useState<string[]>([]);
  const [targetMoveRoom, setTargetMoveRoom] = useState<string>('');

  // Pull students state
  const [pullFilterKelas, setPullFilterKelas] = useState<string>('ALL');
  const [pullFilterSourceRoom, setPullFilterSourceRoom] = useState<string>('ALL');
  const [pullSearch, setPullSearch] = useState<string>('');
  const [checkedPullIds, setCheckedPullIds] = useState<string[]>([]);

  // New room state
  const [newRoomCode, setNewRoomCode] = useState<string>('');
  const [renameRoomDraft, setRenameRoomDraft] = useState<string>('');

  // Quick grouping generator state
  const [patternMode, setPatternMode] = useState<GroupingPattern>('per_tingkat');
  const [patternCap, setPatternCap] = useState<number>(ujianSettings.kapasitasPerRuang || 20);
  const [resequenceNopes, setResequenceNopes] = useState<boolean>(false);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Initialize draft whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    const init: Record<string, DraftStudentSlot> = {};
    activeSiswa.forEach(s => {
      const m = initialComputed.studentMap.get(s.id);
      init[s.id] = {
        ruangUjian: (m?.ruangUjian || s.ruangUjian || `${ujianSettings.defaultRuangPrefix || 'R.'}01`).trim(),
        sesiUjian: (m?.sesiUjian || s.sesiUjian || ujianSettings.sesiTersedia?.[0] || 'Sesi 1').trim(),
        nomorUjian: (m?.nomorUjian || s.nomorUjian || '').trim()
      };
    });
    setDraftMap(init);
    setCustomEmptyRooms([]);
    const defaultRoom =
      initialSelectedRoom ||
      initialComputed.rooms[0]?.nomorRuang ||
      `${ujianSettings.defaultRuangPrefix || 'R.'}01`;
    setSelectedRoom(defaultRoom);
    setRenameRoomDraft(defaultRoom);
    setTargetMoveRoom(initialComputed.rooms[1]?.nomorRuang || defaultRoom);
    setRightPaneMode('members');
    setCheckedMemberIds([]);
    setCheckedPullIds([]);
    setPatternCap(ujianSettings.kapasitasPerRuang || 20);
    setHasChanges(false);
    setLocalBanner(null);
  }, [isOpen]);

  useEffect(() => {
    setRenameRoomDraft(selectedRoom);
    setCheckedMemberIds([]);
  }, [selectedRoom]);

  const showInfo = (msg: string) => {
    setLocalBanner(msg);
  };

  // Group draftMap into rooms
  const roomSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        students: Siswa[];
        kelasCounts: Map<string, number>;
        tingkatCounts: Record<'X' | 'XI' | 'XII', number>;
        maleCount: number;
        femaleCount: number;
        sesiSet: Set<string>;
      }
    >();

    customEmptyRooms.forEach(code => {
      const clean = code.trim();
      if (clean && !map.has(clean)) {
        map.set(clean, {
          code: clean,
          students: [],
          kelasCounts: new Map(),
          tingkatCounts: { X: 0, XI: 0, XII: 0 },
          maleCount: 0,
          femaleCount: 0,
          sesiSet: new Set()
        });
      }
    });

    activeSiswa.forEach(s => {
      const slot = draftMap[s.id];
      const code = (slot?.ruangUjian || `${ujianSettings.defaultRuangPrefix || 'R.'}01`).trim();
      if (!map.has(code)) {
        map.set(code, {
          code,
          students: [],
          kelasCounts: new Map(),
          tingkatCounts: { X: 0, XI: 0, XII: 0 },
          maleCount: 0,
          femaleCount: 0,
          sesiSet: new Set()
        });
      }
      const bucket = map.get(code)!;
      bucket.students.push(s);
      const k = (s.rombelSaatIni || s.kelas || 'Umum').trim();
      bucket.kelasCounts.set(k, (bucket.kelasCounts.get(k) || 0) + 1);
      const t = extractTingkatFromKelas(k);
      if (t) bucket.tingkatCounts[t] += 1;
      if (s.jenisKelamin === 'P') bucket.femaleCount += 1;
      else bucket.maleCount += 1;
      if (slot?.sesiUjian) bucket.sesiSet.add(slot.sesiUjian);
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        extractRoomOrderNumber(a.code) - extractRoomOrderNumber(b.code) ||
        a.code.localeCompare(b.code)
    );
  }, [activeSiswa, draftMap, customEmptyRooms, ujianSettings.defaultRuangPrefix]);

  const filteredRoomSummaries = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    if (!q) return roomSummaries;
    return roomSummaries.filter(r => {
      if (r.code.toLowerCase().includes(q)) return true;
      if (formatRoomDisplayLabel(r.code).toLowerCase().includes(q)) return true;
      for (const k of r.kelasCounts.keys()) {
        if (k.toLowerCase().includes(q)) return true;
      }
      return r.students.some(s => s.nama.toLowerCase().includes(q));
    });
  }, [roomSummaries, roomSearch]);

  const activeRoomBucket = useMemo(
    () => roomSummaries.find(r => r.code === selectedRoom) || roomSummaries[0],
    [roomSummaries, selectedRoom]
  );

  const activeRoomMembers = useMemo(() => {
    const list = activeRoomBucket?.students || [];
    const q = memberSearch.trim().toLowerCase();
    const sorted = [...list].sort(
      (a, b) =>
        (draftMap[a.id]?.nomorUjian || '').localeCompare(draftMap[b.id]?.nomorUjian || '') ||
        a.nama.localeCompare(b.nama)
    );
    if (!q) return sorted;
    return sorted.filter(
      s =>
        s.nama.toLowerCase().includes(q) ||
        (s.rombelSaatIni || s.kelas || '').toLowerCase().includes(q) ||
        (draftMap[s.id]?.nomorUjian || '').toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q)
    );
  }, [activeRoomBucket, memberSearch, draftMap]);

  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    activeSiswa.forEach(s => {
      const k = (s.rombelSaatIni || s.kelas || '').trim();
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [activeSiswa]);

  const pullCandidates = useMemo(() => {
    const q = pullSearch.trim().toLowerCase();
    return activeSiswa.filter(s => {
      const currentRoom = draftMap[s.id]?.ruangUjian || '';
      if (currentRoom === selectedRoom) return false;
      const kelas = (s.rombelSaatIni || s.kelas || '').trim();
      if (pullFilterKelas !== 'ALL' && kelas !== pullFilterKelas) return false;
      if (pullFilterSourceRoom !== 'ALL' && currentRoom !== pullFilterSourceRoom) return false;
      if (!q) return true;
      return (
        s.nama.toLowerCase().includes(q) ||
        kelas.toLowerCase().includes(q) ||
        currentRoom.toLowerCase().includes(q) ||
        (draftMap[s.id]?.nomorUjian || '').toLowerCase().includes(q)
      );
    });
  }, [activeSiswa, draftMap, selectedRoom, pullFilterKelas, pullFilterSourceRoom, pullSearch]);

  // Actions
  const moveStudentIdsToRoom = (studentIds: string[], destinationRoomRaw: string, customSesi?: string) => {
    const dest = destinationRoomRaw.trim();
    if (!dest || studentIds.length === 0) return;
    setDraftMap(prev => {
      const next = { ...prev };
      studentIds.forEach(id => {
        const existing = next[id] || {
          ruangUjian: dest,
          sesiUjian: ujianSettings.sesiTersedia?.[0] || 'Sesi 1',
          nomorUjian: ''
        };
        next[id] = {
          ...existing,
          ruangUjian: dest,
          sesiUjian: customSesi || existing.sesiUjian
        };
      });
      return next;
    });
    setCustomEmptyRooms(prev => prev.filter(r => r !== dest));
    setHasChanges(true);
    setCheckedMemberIds([]);
    setCheckedPullIds([]);
    showInfo(`${studentIds.length} siswa dipindahkan ke ${formatRoomDisplayLabel(dest)} (${dest}).`);
  };

  const handleAddNewRoom = () => {
    const clean = newRoomCode.trim();
    if (!clean) {
      const nextNum = roomSummaries.length + 1;
      const autoCode = `${ujianSettings.defaultRuangPrefix || 'R.'}${String(nextNum).padStart(2, '0')}`;
      setCustomEmptyRooms(prev => (prev.includes(autoCode) ? prev : [...prev, autoCode]));
      setSelectedRoom(autoCode);
      setNewRoomCode('');
      setRightPaneMode('pull');
      showInfo(`Ruang baru ${autoCode} dibuat. Silakan tarik/masukkan siswa di panel kanan.`);
      return;
    }
    if (!roomSummaries.some(r => r.code.toLowerCase() === clean.toLowerCase())) {
      setCustomEmptyRooms(prev => [...prev, clean]);
    }
    setSelectedRoom(clean);
    setNewRoomCode('');
    setRightPaneMode('pull');
    showInfo(`Ruang baru ${clean} siap diisi peserta.`);
  };

  const handleRenameSelectedRoom = () => {
    const nextCode = renameRoomDraft.trim();
    if (!nextCode || nextCode === selectedRoom) return;
    setDraftMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (next[id].ruangUjian === selectedRoom) {
          next[id] = { ...next[id], ruangUjian: nextCode };
        }
      });
      return next;
    });
    setCustomEmptyRooms(prev =>
      prev.map(c => (c === selectedRoom ? nextCode : c))
    );
    setSelectedRoom(nextCode);
    setHasChanges(true);
    showInfo(`Kode ruang diubah menjadi ${nextCode}.`);
  };

  const handleSetRoomSesiBatch = (sesiVal: string) => {
    if (!sesiVal || !activeRoomBucket) return;
    const ids = activeRoomBucket.students.map(s => s.id);
    if (ids.length === 0) return;
    setDraftMap(prev => {
      const next = { ...prev };
      ids.forEach(id => {
        if (next[id]) next[id] = { ...next[id], sesiUjian: sesiVal };
      });
      return next;
    });
    setHasChanges(true);
    showInfo(`Sesi untuk ${ids.length} peserta di ${selectedRoom} diatur ke ${sesiVal}.`);
  };

  const handleApplyGroupingPattern = () => {
    const cap = Math.max(1, Math.min(200, patternCap || 20));
    const startRoom = Math.max(1, ujianSettings.mulaiNomorRuang || 1);
    const prefix = ujianSettings.defaultRuangPrefix ?? 'R.';
    const sessions =
      ujianSettings.sesiTersedia && ujianSettings.sesiTersedia.length > 0
        ? ujianSettings.sesiTersedia
        : ['Sesi 1 (07.30 - 09.30)'];
    const baseNopes = resolveAwalNopes10(
      ujianSettings.nomorPesertaAwal || ujianSettings.prefixNomorUjian
    );

    const next: Record<string, DraftStudentSlot> = {};
    let roomCursor = startRoom;

    const assignToRoom = (s: Siswa, roomNum: number, globalIdx: number, sesiOverride?: string) => {
      const ruangUjian = `${prefix}${String(roomNum).padStart(2, '0')}`;
      const prevSlot = draftMap[s.id];
      const existingNopes = prevSlot?.nomorUjian || s.nomorUjian || '';
      next[s.id] = {
        ruangUjian,
        sesiUjian: sesiOverride || prevSlot?.sesiUjian || s.sesiUjian || sessions[0],
        nomorUjian:
          resequenceNopes || !existingNopes
            ? formatNopes10(baseNopes, globalIdx)
            : existingNopes
      };
    };

    if (patternMode === 'sequential') {
      activeSiswa.forEach((s, idx) => {
        assignToRoom(s, startRoom + Math.floor(idx / cap), idx);
      });
    } else if (patternMode === 'per_tingkat') {
      const levels: ('X' | 'XI' | 'XII' | 'LAIN')[] = ['X', 'XI', 'XII', 'LAIN'];
      let seqIdx = 0;
      levels.forEach(lv => {
        const group = activeSiswa.filter(s => {
          const t = extractTingkatFromKelas(s.rombelSaatIni || s.kelas);
          return lv === 'LAIN' ? !t : t === lv;
        });
        if (group.length === 0) return;
        group.forEach((s, i) => {
          assignToRoom(s, roomCursor + Math.floor(i / cap), seqIdx++);
        });
        roomCursor += Math.ceil(group.length / cap);
      });
    } else if (patternMode === 'per_kelas') {
      let lastClass = '';
      let posInClass = 0;
      activeSiswa.forEach((s, idx) => {
        const k = (s.rombelSaatIni || s.kelas || 'Umum').trim();
        if (idx > 0 && k !== lastClass) {
          roomCursor += Math.floor((posInClass - 1) / cap) + 1;
          posInClass = 0;
        }
        lastClass = k;
        assignToRoom(s, roomCursor + Math.floor(posInClass / cap), idx);
        posInClass++;
      });
    } else if (patternMode === 'per_sesi') {
      const sesiCounters = new Map<string, number>();
      activeSiswa.forEach((s, idx) => {
        const sesi = sessions[idx % sessions.length];
        const pos = sesiCounters.get(sesi) || 0;
        sesiCounters.set(sesi, pos + 1);
        assignToRoom(s, startRoom + Math.floor(pos / cap), idx, sesi);
      });
    } else if (patternMode === 'campur_silang') {
      // Interleave students from different grade levels / classes across rooms so each room mixes levels evenly
      const byKelas = new Map<string, Siswa[]>();
      activeSiswa.forEach(s => {
        const k = (s.rombelSaatIni || s.kelas || 'Umum').trim();
        if (!byKelas.has(k)) byKelas.set(k, []);
        byKelas.get(k)!.push(s);
      });
      const tingkatOrder = (lv: 'X' | 'XI' | 'XII' | null) =>
        lv === 'X' ? 0 : lv === 'XI' ? 1 : lv === 'XII' ? 2 : 3;
      const queues = Array.from(byKelas.entries())
        .sort(([ka], [kb]) => {
          const ta = tingkatOrder(extractTingkatFromKelas(ka));
          const tb = tingkatOrder(extractTingkatFromKelas(kb));
          if (ta !== tb) return ta - tb;
          return ka.localeCompare(kb);
        })
        .map(([, list]) => [...list]);

      // Group queues by X, XI, XII then round-robin interleave across levels first
      const qX = activeSiswa.filter(s => extractTingkatFromKelas(s.rombelSaatIni || s.kelas) === 'X');
      const qXI = activeSiswa.filter(s => extractTingkatFromKelas(s.rombelSaatIni || s.kelas) === 'XI');
      const qXII = activeSiswa.filter(s => extractTingkatFromKelas(s.rombelSaatIni || s.kelas) === 'XII');
      const qOther = activeSiswa.filter(s => !extractTingkatFromKelas(s.rombelSaatIni || s.kelas));
      const levelPools = [qX, qXI, qXII, qOther].filter(p => p.length > 0);

      const interleaved: Siswa[] = [];
      if (levelPools.length >= 2) {
        let idx = 0;
        let remaining = true;
        while (remaining) {
          remaining = false;
          for (const pool of levelPools) {
            if (idx < pool.length) {
              interleaved.push(pool[idx]);
              remaining = true;
            }
          }
          idx++;
        }
      } else {
        // Interleave across individual classes
        let idx = 0;
        let remaining = true;
        while (remaining) {
          remaining = false;
          for (const q of queues) {
            if (idx < q.length) {
              interleaved.push(q[idx]);
              remaining = true;
            }
          }
          idx++;
        }
      }

      interleaved.forEach((s, idx) => {
        assignToRoom(s, startRoom + Math.floor(idx / cap), idx);
      });
    }

    setDraftMap(next);
    setCustomEmptyRooms([]);
    const firstRoom = `${prefix}${String(startRoom).padStart(2, '0')}`;
    setSelectedRoom(firstRoom);
    setHasChanges(true);

    if (onUpdateUjianSettings && patternCap !== ujianSettings.kapasitasPerRuang) {
      onUpdateUjianSettings({
        ...ujianSettings,
        kapasitasPerRuang: cap,
        ...(patternMode === 'sequential' || patternMode === 'per_kelas' || patternMode === 'per_sesi'
          ? { modePembagianRuang: patternMode }
          : {})
      });
    }

    const totalNewRooms = new Set(Object.values(next).map(v => v.ruangUjian)).size;
    showInfo(
      `Pola "${patternMode.replace('_', ' ')}" diterapkan (${cap} anak/ruang → ${totalNewRooms} ruang). Klik "Simpan Kelompok Ruang" untuk memperbarui kartu & daftar hadir.`
    );
  };

  const handleSaveAndClose = () => {
    const updatedList = siswaList.map(s => {
      const slot = draftMap[s.id];
      if (!slot) return s;
      return {
        ...s,
        ruangUjian: slot.ruangUjian,
        sesiUjian: slot.sesiUjian,
        nomorUjian: slot.nomorUjian || s.nomorUjian
      };
    });

    const totalRooms = roomSummaries.filter(r => r.students.length > 0).length;
    onSaveSiswa(
      updatedList,
      `Pengelompokan ${activeSiswa.length} peserta ke dalam ${totalRooms} ruang ujian berhasil disimpan dan disinkronkan ke Kartu Ujian, Tempel Ruang, dan Daftar Hadir.`
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="no-print print:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Atur Kelompok Anak per Ruang Ujian"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                Atur Kelompok Anak per Ruang Ujian
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-300 tabular-nums">
                <span>{activeSiswa.length} Peserta Aktif</span>
                <span aria-hidden="true">·</span>
                <span>{roomSummaries.length} Ruang</span>
                <span aria-hidden="true">·</span>
                <span>Kapasitas acuan {ujianSettings.kapasitasPerRuang || 20} anak/ruang</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Grouping Pattern Toolbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
          <div className="flex flex-wrap items-end gap-2.5 text-xs">
            <div className="min-w-[210px] flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Pola Pengelompokan Otomatis
              </label>
              <select
                value={patternMode}
                onChange={e => setPatternMode(e.target.value as GroupingPattern)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
              >
                <option value="per_tingkat">Pisah per Tingkat (X, XI, XII tidak bercampur)</option>
                <option value="campur_silang">Campur Silang Lintas Tingkat (X + XI + XII / Anti-Contek)</option>
                <option value="per_kelas">Pisah per Kelas / Rombel</option>
                <option value="sequential">Berurutan Semua Peserta (R.01 dst.)</option>
                <option value="per_sesi">Reset Ruang per Sesi</option>
              </select>
            </div>

            <div className="w-32">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Anak per Ruang
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={patternCap}
                onChange={e => setPatternCap(Math.max(1, Math.min(200, Number(e.target.value) || 20)))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center tabular-nums"
              />
            </div>

            <label className="inline-flex items-center gap-1.5 py-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resequenceNopes}
                onChange={e => setResequenceNopes(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Urutkan ulang No. Peserta</span>
            </label>

            <button
              type="button"
              onClick={handleApplyGroupingPattern}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Terapkan Pola Kelompok</span>
            </button>
          </div>

          {localBanner && (
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-md text-xs flex items-center justify-between gap-2">
              <span>{localBanner}</span>
              <button
                type="button"
                onClick={() => setLocalBanner(null)}
                className="text-[11px] font-semibold underline shrink-0"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Main Workspace */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Pane: Room List */}
          <div className="lg:col-span-4 border-r border-slate-200 flex flex-col min-h-0 bg-slate-50/50">
            <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roomSearch}
                  onChange={e => setRoomSearch(e.target.value)}
                  placeholder="Cari ruang, kelas, atau nama anak..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newRoomCode}
                  onChange={e => setNewRoomCode(e.target.value)}
                  placeholder="Kode ruang baru (mis. R.36 / LABKOM)"
                  className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddNewRoom}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ruang</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
              {filteredRoomSummaries.map(room => {
                const isSelected = room.code === selectedRoom;
                const kelasEntries = Array.from(room.kelasCounts.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, cnt]) => `${k} (${cnt})`);
                const kelasPreview =
                  kelasEntries.length > 3
                    ? `${kelasEntries.slice(0, 3).join(', ')} +${kelasEntries.length - 3}`
                    : kelasEntries.join(', ') || 'Belum ada peserta';

                const levelsPresent = (['X', 'XI', 'XII'] as const).filter(
                  lv => room.tingkatCounts[lv] > 0
                );
                const tingkatSummary =
                  levelsPresent.length > 1
                    ? `Campuran ${levelsPresent.join('+')}`
                    : levelsPresent[0]
                      ? `Tingkat ${levelsPresent[0]}`
                      : 'Kosong';

                const isOverCap = room.students.length > (ujianSettings.kapasitasPerRuang || 20);

                return (
                  <button
                    key={room.code}
                    type="button"
                    onClick={() => setSelectedRoom(room.code)}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-r-2 border-r-blue-600'
                        : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <DoorOpen
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {room.code} · {tingkatSummary}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums shrink-0 ${
                          room.students.length === 0
                            ? 'text-slate-400'
                            : isOverCap
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {room.students.length} anak
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600 truncate">
                      {kelasPreview}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 tabular-nums">
                      L: {room.maleCount} · P: {room.femaleCount}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Active Room Members & Pull Interface */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-white">
            {/* Selected Room Header & Actions */}
            <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-white shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {formatRoomDisplayLabel(selectedRoom)}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={renameRoomDraft}
                      onChange={e => setRenameRoomDraft(e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-mono font-bold"
                      title="Ubah kode ruang ini"
                    />
                    {renameRoomDraft.trim() && renameRoomDraft.trim() !== selectedRoom && (
                      <button
                        type="button"
                        onClick={handleRenameSelectedRoom}
                        className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold"
                      >
                        Ubah Kode
                      </button>
                    )}
                  </div>
                  <select
                    value={activeRoomBucket?.sesiSet.size === 1 ? Array.from(activeRoomBucket.sesiSet)[0] : ''}
                    onChange={e => handleSetRoomSesiBatch(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-700"
                    title="Atur Sesi Ujian untuk seluruh anak di ruang ini"
                  >
                    <option value="">Atur Sesi Ruang Ini...</option>
                    {(ujianSettings.sesiTersedia || ['Sesi 1 (07.30 - 09.30)']).map(s => (
                      <option key={s} value={s}>
                        Sesi: {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Segmented Switch: Members vs Pull Students */}
                <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setRightPaneMode('members')}
                    className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      rightPaneMode === 'members'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Anggota Ruang ({activeRoomBucket?.students.length || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPaneMode('pull')}
                    className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      rightPaneMode === 'pull'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Tarik Anak / Kelas ke Ruang Ini</span>
                  </button>
                </div>
              </div>

              {rightPaneMode === 'members' ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        placeholder="Cari anggota ruang..."
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCheckedMemberIds(
                          checkedMemberIds.length === activeRoomMembers.length
                            ? []
                            : activeRoomMembers.map(s => s.id)
                        )
                      }
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1 whitespace-nowrap"
                    >
                      {checkedMemberIds.length > 0 &&
                      checkedMemberIds.length === activeRoomMembers.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>Pilih Semua</span>
                    </button>
                  </div>

                  {/* Batch Move Bar */}
                  {checkedMemberIds.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <span className="font-bold text-amber-900 tabular-nums">
                        {checkedMemberIds.length} dipilih →
                      </span>
                      <select
                        value={targetMoveRoom}
                        onChange={e => setTargetMoveRoom(e.target.value)}
                        className="px-2 py-1 border border-amber-300 rounded bg-white text-xs font-semibold"
                      >
                        {roomSummaries
                          .filter(r => r.code !== selectedRoom)
                          .map(r => (
                            <option key={r.code} value={r.code}>
                              {r.code} ({r.students.length} anak)
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => moveStudentIdsToRoom(checkedMemberIds, targetMoveRoom)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold rounded flex items-center gap-1 whitespace-nowrap"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Pindahkan</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={pullFilterKelas}
                    onChange={e => setPullFilterKelas(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">Semua Kelas ({activeSiswa.length})</option>
                    {distinctClasses.map(k => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>

                  <select
                    value={pullFilterSourceRoom}
                    onChange={e => setPullFilterSourceRoom(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">Dari Semua Ruang Lain</option>
                    {roomSummaries
                      .filter(r => r.code !== selectedRoom)
                      .map(r => (
                        <option key={r.code} value={r.code}>
                          Dari {r.code} ({r.students.length} anak)
                        </option>
                      ))}
                  </select>

                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pullSearch}
                      onChange={e => setPullSearch(e.target.value)}
                      placeholder="Cari nama / NIS siswa..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  {pullCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCheckedPullIds(
                          checkedPullIds.length === pullCandidates.length
                            ? []
                            : pullCandidates.map(s => s.id)
                        )
                      }
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      {checkedPullIds.length === pullCandidates.length
                        ? 'Batal Pilih'
                        : `Pilih Semua (${pullCandidates.length})`}
                    </button>
                  )}

                  {checkedPullIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => moveStudentIdsToRoom(checkedPullIds, selectedRoom)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Masukkan {checkedPullIds.length} Anak ke {selectedRoom}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto">
              {rightPaneMode === 'members' ? (
                activeRoomMembers.length === 0 ? (
                  <div className="py-16 text-center px-6 space-y-2">
                    <DoorOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">
                      Ruang {selectedRoom} Belum Memiliki Peserta
                    </p>
                    <p className="text-xs text-slate-500">
                      Klik tab "Tarik Anak / Kelas ke Ruang Ini" di kanan atas untuk memasukkan siswa atau seluruh rombel.
                    </p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">Pilih</th>
                        <th className="py-2 px-2 w-10 text-center">No</th>
                        <th className="py-2 px-2 w-28">No. Peserta</th>
                        <th className="py-2 px-3 text-left">Nama Peserta Didik</th>
                        <th className="py-2 px-2 w-20 text-center">Kelas</th>
                        <th className="py-2 px-2 w-12 text-center">JK</th>
                        <th className="py-2 px-3 w-44 text-right">Pindah Cepat ke Ruang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeRoomMembers.map((s, idx) => {
                        const checked = checkedMemberIds.includes(s.id);
                        const slot = draftMap[s.id];
                        return (
                          <tr
                            key={s.id}
                            className={`hover:bg-slate-50 ${checked ? 'bg-blue-50/50' : ''}`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={e =>
                                  setCheckedMemberIds(prev =>
                                    e.target.checked
                                      ? [...prev, s.id]
                                      : prev.filter(id => id !== s.id)
                                  )
                                }
                                className="rounded text-blue-600"
                              />
                            </td>
                            <td className="py-2 px-2 text-center tabular-nums text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-[11px] tabular-nums text-slate-700">
                              {slot?.nomorUjian || '-'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">{s.nama}</td>
                            <td className="py-2 px-2 text-center font-semibold text-slate-700">
                              {s.rombelSaatIni || s.kelas}
                            </td>
                            <td className="py-2 px-2 text-center text-slate-500">
                              {s.jenisKelamin}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <select
                                value={selectedRoom}
                                onChange={e => {
                                  if (e.target.value !== selectedRoom) {
                                    moveStudentIdsToRoom([s.id], e.target.value);
                                  }
                                }}
                                className="px-2 py-1 border border-slate-200 rounded bg-white text-[11px] font-medium text-slate-700"
                              >
                                {roomSummaries.map(r => (
                                  <option key={r.code} value={r.code}>
                                    {r.code === selectedRoom
                                      ? `${r.code} (Saat ini)`
                                      : `Pindah → ${r.code} (${r.students.length})`}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">Pilih</th>
                      <th className="py-2 px-3 text-left">Nama Peserta Didik</th>
                      <th className="py-2 px-2 w-24 text-center">Kelas</th>
                      <th className="py-2 px-2 w-24 text-center">Ruang Asal</th>
                      <th className="py-2 px-3 w-36 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pullCandidates.map(s => {
                      const checked = checkedPullIds.includes(s.id);
                      const originRoom = draftMap[s.id]?.ruangUjian || '-';
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-50 ${checked ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e =>
                                setCheckedPullIds(prev =>
                                  e.target.checked
                                    ? [...prev, s.id]
                                    : prev.filter(id => id !== s.id)
                                )
                              }
                              className="rounded text-blue-600"
                            />
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">{s.nama}</td>
                          <td className="py-2 px-2 text-center font-semibold text-slate-700">
                            {s.rombelSaatIni || s.kelas}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600">
                            {originRoom}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => moveStudentIdsToRoom([s.id], selectedRoom)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[11px] whitespace-nowrap"
                            >
                              + Masukkan ke {selectedRoom}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {pullCandidates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          Tidak ada siswa yang sesuai filter di luar {selectedRoom}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {hasChanges ? (
              <span className="font-semibold text-amber-800">
                Ada perubahan pengelompokan ruang yang belum disimpan ke Master Data.
              </span>
            ) : (
              <span>
                Perubahan kelompok anak per ruang akan otomatis menyinkronkan Kartu Peserta, Tempel Ruang & Daftar Hadir.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const resetMap: Record<string, DraftStudentSlot> = {};
                activeSiswa.forEach(s => {
                  const m = initialComputed.studentMap.get(s.id);
                  resetMap[s.id] = {
                    ruangUjian: (m?.ruangUjian || s.ruangUjian || `${ujianSettings.defaultRuangPrefix || 'R.'}01`).trim(),
                    sesiUjian: (m?.sesiUjian || s.sesiUjian || ujianSettings.sesiTersedia?.[0] || 'Sesi 1').trim(),
                    nomorUjian: (m?.nomorUjian || s.nomorUjian || '').trim()
                  };
                });
                setDraftMap(resetMap);
                setCustomEmptyRooms([]);
                setHasChanges(false);
                showInfo('Draf dikembalikan ke pembagian awal.');
              }}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Draf</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Kelompok Ruang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
