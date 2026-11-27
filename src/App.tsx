/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  SuratMasuk, 
  SuratKeluar, 
  SchoolProfile, 
  AuditLog, 
  BackupRecord, 
  Disposisi,
  Siswa,
  Guru,
  Tendik,
  TemplateSurat,
  KartuUjianSettings,
  PanitiaPengawasItem,
  KartuPanitiaSettings,
  TempelRuangConfigBundle,
  StrukturOrganisasiBundle
} from './types';
import { 
  getStoredSchoolProfile, 
  saveStoredSchoolProfile, 
  getStoredUsers, 
  saveStoredUsers, 
  getStoredCurrentUser, 
  saveStoredCurrentUser, 
  getStoredSuratMasuk, 
  saveStoredSuratMasuk, 
  getStoredSuratKeluar, 
  saveStoredSuratKeluar, 
  getStoredAuditLogs, 
  appendAuditLog, 
  getStoredBackupHistory, 
  sendBackupToEmail, 
  exportToCSV,
  getStoredSiswa,
  saveStoredSiswa,
  getStoredGuru,
  saveStoredGuru,
  getStoredTendik,
  saveStoredTendik,
  getStoredTemplates,
  saveStoredTemplates,
  getStoredKartuUjianSettings,
  saveStoredKartuUjianSettings,
  getStoredPanitiaPengawas,
  saveStoredPanitiaPengawas,
  getStoredKartuPanitiaSettings,
  saveStoredKartuPanitiaSettings,
  getStoredTempelRuangConfig,
  saveStoredTempelRuangConfig,
  getStoredStrukturOrganisasi,
  saveStoredStrukturOrganisasi,
  hydrateStoredStrukturOrganisasiAsync,
  hydrateStoredGtkAsync
} from './services/storageService';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { SuratMasukView } from './components/SuratMasukView';
import { SuratKeluarView } from './components/SuratKeluarView';
import { DisposisiModal } from './components/DisposisiModal';
import { BukuAgendaView } from './components/BukuAgendaView';
import { LaporanCetakView } from './components/LaporanCetakView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { UserManagementView } from './components/UserManagementView';
import { SchoolProfileView } from './components/SchoolProfileView';
import { AuditLogView } from './components/AuditLogView';
import { MasterDataView } from './components/MasterDataView';
import { SuratGeneratorView } from './components/SuratGeneratorView';
import { KartuUjianView } from './components/KartuUjianView';
import { KartuPanitiaPengawasView } from './components/KartuPanitiaPengawasView';
import { SuratIjinMasukUjianView } from './components/SuratIjinMasukUjianView';
import { BukuIndukSiswaView } from './components/BukuIndukSiswaView';
import { BukuIndukRaporView } from './components/BukuIndukRaporView';
import { TempelNomorRuangView } from './components/TempelNomorRuangView';
import { DaftarHadirUjianView } from './components/DaftarHadirUjianView';
import { BeritaAcaraUjianView } from './components/BeritaAcaraUjianView';
import { StrukturOrganisasiView } from './components/StrukturOrganisasiView';
import { KehadiranPegawaiView } from './components/KehadiranPegawaiView';
import { KartuMasterGtkView } from './components/KartuMasterGtkView';
import { DenahRuangView } from './components/DenahRuangView';
import { SkpPegawaiView } from './components/SkpPegawaiView';
import {
  JadwalPengawasScanPortal,
  resolveScannedProctorFromQuery
} from './components/JadwalPengawasScanPortal';
import { CardFontStudioValue, CardDimensionsStudioValue } from './components/CardDesignLayers';
import { PrintModal, PrintConfig } from './components/PrintModal';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { WebAddressModal } from './components/WebAddressModal';

import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Printer, 
  Plus, 
  Download, 
  Mail, 
  Sparkles,
  Maximize2,
  Minimize2,
  Globe
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Sidebar Collapsible Slide State (Default expanded on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sip_tu_sidebar_open_v1');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Full viewport document focus mode
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Core Data States
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(getStoredSchoolProfile);
  const [users, setUsers] = useState<User[]>(getStoredUsers);
  const [currentUser, setCurrentUser] = useState<User>(getStoredCurrentUser);
  const [suratMasukList, setSuratMasukList] = useState<SuratMasuk[]>(getStoredSuratMasuk);
  const [suratKeluarList, setSuratKeluarList] = useState<SuratKeluar[]>(getStoredSuratKeluar);
  const [siswaList, setSiswaList] = useState<Siswa[]>(getStoredSiswa);
  const [guruList, setGuruList] = useState<Guru[]>(getStoredGuru);
  const [tendikList, setTendikList] = useState<Tendik[]>(getStoredTendik);
  const [templates, setTemplates] = useState<TemplateSurat[]>(getStoredTemplates);
  const [kartuUjianSettings, setKartuUjianSettings] = useState<KartuUjianSettings>(getStoredKartuUjianSettings);
  const [panitiaPengawasList, setPanitiaPengawasList] = useState<PanitiaPengawasItem[]>(getStoredPanitiaPengawas);
  const [kartuPanitiaSettings, setKartuPanitiaSettings] = useState<KartuPanitiaSettings>(getStoredKartuPanitiaSettings);
  const [tempelRuangBundle, setTempelRuangBundle] = useState<TempelRuangConfigBundle>(getStoredTempelRuangConfig);
  const [strukturBundle, setStrukturBundle] = useState<StrukturOrganisasiBundle>(getStoredStrukturOrganisasi);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(getStoredAuditLogs);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>(getStoredBackupHistory);

  // Pre-selection bridge from Master Data to Letter Generator
  const [letterPreSelection, setLetterPreSelection] = useState<{ type: 'siswa' | 'guru' | 'tendik'; data: Siswa | Guru | Tendik } | null>(null);
  const [selectedKartuGtkId, setSelectedKartuGtkId] = useState<string | null>(null);

  // Modals
  const [disposisiSurat, setDisposisiSurat] = useState<SuratMasuk | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig | null>(null);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);
  const [isWebAddressModalOpen, setIsWebAddressModalOpen] = useState(false);

  const hasEditedStrukturRef = React.useRef(false);
  const hasEditedGtkRef = React.useRef(false);

  // Refresh helper
  const reloadAllData = () => {
    setSchoolProfile(getStoredSchoolProfile());
    setUsers(getStoredUsers());
    setCurrentUser(getStoredCurrentUser());
    setSuratMasukList(getStoredSuratMasuk());
    setSuratKeluarList(getStoredSuratKeluar());
    setSiswaList(getStoredSiswa());
    setGuruList(getStoredGuru());
    setTendikList(getStoredTendik());
    setTemplates(getStoredTemplates());
    setKartuUjianSettings(getStoredKartuUjianSettings());
    setPanitiaPengawasList(getStoredPanitiaPengawas());
    setKartuPanitiaSettings(getStoredKartuPanitiaSettings());
    setTempelRuangBundle(getStoredTempelRuangConfig());
    setStrukturBundle(getStoredStrukturOrganisasi());
    setAuditLogs(getStoredAuditLogs());
    setBackupHistory(getStoredBackupHistory());
    void hydrateStoredStrukturOrganisasiAsync().then(hydrated => {
      if (hydrated && !hasEditedStrukturRef.current) {
        setStrukturBundle(hydrated);
      }
    });
    void hydrateStoredGtkAsync().then(hydrated => {
      if (hydrated && !hasEditedGtkRef.current) {
        if (hydrated.guru) setGuruList(hydrated.guru);
        if (hydrated.tendik) setTendikList(hydrated.tendik);
      }
    });
  };

  // Synchronize on load
  useEffect(() => {
    reloadAllData();
  }, []);

  // Save sidebar preference
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sip_tu_sidebar_open_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut listener for sidebar toggle (Ctrl+B or 'b' when not in inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input, textarea, or select, don't trigger shortcut
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        return;
      }

      if ((e.ctrlKey && (e.key === 'b' || e.key === 'B')) || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Surat Masuk
  const handleSaveSuratMasuk = (surat: SuratMasuk, isNew: boolean) => {
    let updatedList: SuratMasuk[];
    if (isNew) {
      updatedList = [surat, ...suratMasukList];
      appendAuditLog('TAMBAH_SURAT_MASUK', `Mendaftarkan surat masuk baru ${surat.nomorAgenda} dari ${surat.pengirim}.`);
    } else {
      updatedList = suratMasukList.map(s => s.id === surat.id ? surat : s);
      appendAuditLog('EDIT_SURAT_MASUK', `Memperbarui data surat masuk ${surat.nomorAgenda}.`);
    }
    saveStoredSuratMasuk(updatedList);
    setSuratMasukList(updatedList);
    setAuditLogs(getStoredAuditLogs());
  };

  const handleDeleteSuratMasuk = (id: string) => {
    const target = suratMasukList.find(s => s.id === id);
    const updatedList = suratMasukList.filter(s => s.id !== id);
    saveStoredSuratMasuk(updatedList);
    setSuratMasukList(updatedList);
    if (target) {
      appendAuditLog('HAPUS_SURAT_MASUK', `Menghapus surat masuk ${target.nomorAgenda} (${target.nomorSurat}).`);
    }
    setAuditLogs(getStoredAuditLogs());
  };

  // Handlers for Surat Keluar
  const handleSaveSuratKeluar = (surat: SuratKeluar, isNew: boolean) => {
    let updatedList: SuratKeluar[];
    if (isNew) {
      updatedList = [surat, ...suratKeluarList];
      appendAuditLog('TAMBAH_SURAT_KELUAR', `Menerbitkan draf surat keluar ${surat.nomorAgenda} tujuan ${surat.tujuan}.`);
    } else {
      updatedList = suratKeluarList.map(s => s.id === surat.id ? surat : s);
      appendAuditLog('EDIT_SURAT_KELUAR', `Memperbarui status/isi surat keluar ${surat.nomorAgenda} (${surat.status}).`);
    }
    saveStoredSuratKeluar(updatedList);
    setSuratKeluarList(updatedList);
    setAuditLogs(getStoredAuditLogs());
  };

  const handleDeleteSuratKeluar = (id: string) => {
    const target = suratKeluarList.find(s => s.id === id);
    const updatedList = suratKeluarList.filter(s => s.id !== id);
    saveStoredSuratKeluar(updatedList);
    setSuratKeluarList(updatedList);
    if (target) {
      appendAuditLog('HAPUS_SURAT_KELUAR', `Menghapus surat keluar ${target.nomorAgenda} (${target.nomorSurat}).`);
    }
    setAuditLogs(getStoredAuditLogs());
  };

  // Disposisi Handler
  const handleSaveDisposisi = (suratId: string, disposisi: Disposisi, newStatus: string) => {
    const updatedList = suratMasukList.map(s => {
      if (s.id === suratId) {
        return {
          ...s,
          status: newStatus as any,
          disposisiList: [disposisi, ...s.disposisiList.filter(d => d.id !== disposisi.id)]
        };
      }
      return s;
    });

    saveStoredSuratMasuk(updatedList);
    setSuratMasukList(updatedList);

    const targetSurat = suratMasukList.find(s => s.id === suratId);
    appendAuditLog('INPUT_DISPOSISI', `Membuat lembar disposisi untuk ${targetSurat?.nomorAgenda} diteruskan kepada ${disposisi.diteruskanKepada.join(', ')}.`);
    setAuditLogs(getStoredAuditLogs());
  };

  // User Switcher & Management
  const handleSwitchUser = (user: User) => {
    saveStoredCurrentUser(user);
    setCurrentUser(user);
    appendAuditLog('LOGIN_SISTEM', `Beralih sesi login sebagai ${user.name} (${user.jabatan}).`);
    setAuditLogs(getStoredAuditLogs());
  };

  const handleSaveUser = (user: User, isNew: boolean) => {
    let updatedUsers: User[];
    if (isNew) {
      updatedUsers = [...users, user];
      appendAuditLog('TAMBAH_PENGGUNA', `Menambahkan akun baru ${user.username} (${user.name}) peran ${user.role}.`);
    } else {
      updatedUsers = users.map(u => u.id === user.id ? user : u);
      appendAuditLog('EDIT_PENGGUNA', `Memperbarui akun ${user.username} (${user.name}).`);
    }
    saveStoredUsers(updatedUsers);
    setUsers(updatedUsers);
    if (currentUser.id === user.id) {
      saveStoredCurrentUser(user);
      setCurrentUser(user);
    }
    setAuditLogs(getStoredAuditLogs());
  };

  // School Profile Update
  const handleSaveSchoolProfile = (profile: SchoolProfile) => {
    saveStoredSchoolProfile(profile);
    setSchoolProfile(profile);
    appendAuditLog('KONFIGURASI_PROFIL', `Memperbarui konfigurasi instansi & kop surat ${profile.namaSekolah}.`);
    setAuditLogs(getStoredAuditLogs());
  };

  // Master Data & Templates Handlers
  const handleUpdateSiswa = (list: Siswa[]) => {
    saveStoredSiswa(list);
    setSiswaList(list);
  };

  const handleUpdateGuru = (list: Guru[]) => {
    hasEditedGtkRef.current = true;
    saveStoredGuru(list);
    setGuruList(list);
  };

  const handleUpdateTendik = (list: Tendik[]) => {
    hasEditedGtkRef.current = true;
    saveStoredTendik(list);
    setTendikList(list);
  };

  const handleUpdateTemplates = (list: TemplateSurat[]) => {
    saveStoredTemplates(list);
    setTemplates(list);
  };

  const handleUpdateKartuUjianSettings = (settings: KartuUjianSettings) => {
    saveStoredKartuUjianSettings(settings);
    setKartuUjianSettings(settings);
  };

  const handleUpdatePanitiaPengawas = (list: PanitiaPengawasItem[]) => {
    saveStoredPanitiaPengawas(list);
    setPanitiaPengawasList(list);
  };

  const handleUpdateKartuPanitiaSettings = (settings: KartuPanitiaSettings) => {
    saveStoredKartuPanitiaSettings(settings);
    setKartuPanitiaSettings(settings);
  };

  const handleUpdateTempelRuangBundle = (nextBundle: TempelRuangConfigBundle) => {
    saveStoredTempelRuangConfig(nextBundle);
    setTempelRuangBundle(nextBundle);
  };

  const handleUpdateStrukturBundle = (nextBundle: StrukturOrganisasiBundle) => {
    hasEditedStrukturRef.current = true;
    setStrukturBundle(nextBundle);
    saveStoredStrukturOrganisasi(nextBundle);
  };

  const handleSyncCardTypographyToAll = (typo: CardFontStudioValue) => {
    const sharedPatch = {
      desainFont: typo.headingFont,
      desainFontBody: typo.bodyFont,
      desainFontScale: typo.fontScale ?? 100,
      desainFontWeight: typo.fontWeight || 'tebal',
      desainLetterSpacing: typo.letterSpacing || 'standar',
      desainJudulKapital: typo.uppercaseTitle !== false
    };
    const nextUjian: KartuUjianSettings = {
      ...kartuUjianSettings,
      ...sharedPatch
    };
    const nextPanitia: KartuPanitiaSettings = {
      ...kartuPanitiaSettings,
      ...sharedPatch,
      desainFontPanitia: typo.panitiaFont,
      desainFontPengawas: typo.pengawasFont
    };
    saveStoredKartuUjianSettings(nextUjian);
    setKartuUjianSettings(nextUjian);
    saveStoredKartuPanitiaSettings(nextPanitia);
    setKartuPanitiaSettings(nextPanitia);
    appendAuditLog(
      'SINKRON_FONT_KARTU',
      `Menyeragamkan pengaturan tipografi (${typo.headingFont || 'default'}, skala ${sharedPatch.desainFontScale}%) ke Kartu Panitia, Pengawas, dan Peserta.`
    );
  };

  const handleSyncCardDimensionsToAll = (dims: CardDimensionsStudioValue) => {
    const siswaWidthMm = dims.sharedWidthMm ?? dims.panitiaWidthMm ?? dims.pengawasWidthMm;
    const siswaHeightMm = dims.sharedHeightMm ?? dims.panitiaHeightMm ?? dims.pengawasHeightMm;
    const nextUjian: KartuUjianSettings = {
      ...kartuUjianSettings,
      lebarKartuMm: siswaWidthMm,
      tinggiKartuMm: siswaHeightMm
    };
    const nextPanitia: KartuPanitiaSettings = {
      ...kartuPanitiaSettings,
      lebarKartuMm: siswaWidthMm,
      tinggiKartuMm: siswaHeightMm,
      lebarKartuPanitiaMm: dims.panitiaWidthMm,
      tinggiKartuPanitiaMm: dims.panitiaHeightMm,
      lebarKartuPengawasMm: dims.pengawasWidthMm,
      tinggiKartuPengawasMm: dims.pengawasHeightMm
    };
    saveStoredKartuUjianSettings(nextUjian);
    setKartuUjianSettings(nextUjian);
    saveStoredKartuPanitiaSettings(nextPanitia);
    setKartuPanitiaSettings(nextPanitia);
    appendAuditLog(
      'SINKRON_UKURAN_KARTU',
      `Menyeragamkan dimensi kartu (${siswaWidthMm ? `${siswaWidthMm}×${siswaHeightMm || '-'} mm` : 'Otomatis Grid'}) ke Kartu Panitia, Pengawas, dan Peserta.`
    );
    setAuditLogs(getStoredAuditLogs());
  };

  const handleSelectForLetter = (target: { type: 'siswa' | 'guru' | 'tendik'; data: Siswa | Guru | Tendik }) => {
    setLetterPreSelection(target);
    setCurrentTab('template-ai');
  };

  // Direct Email Backup Trigger
  const handleQuickEmailBackup = async () => {
    const targetEmail = schoolProfile.emailBackupDefault || 'smanixsurabaya@gmail.com';
    const res = await sendBackupToEmail(targetEmail, 'Pencadangan cepat dari bilah menu utama');
    if (res.success) {
      alert(`Cadangan database berhasil dikirimkan ke surel: ${targetEmail}`);
      reloadAllData();
    }
  };

  // Pending counts for sidebar
  const counts = {
    suratMasuk: suratMasukList.length,
    suratKeluar: suratKeluarList.length,
    disposisiPending: suratMasukList.filter(s => s.status === 'Baru' || s.status === 'Menunggu Disposisi').length,
    reviewPending: suratKeluarList.filter(s => s.status === 'Draf' || s.status === 'Review KTU').length
  };

  // Handle Letter Selection from Global Search
  const handleSelectLetterFromSearch = (
    type: 'masuk' | 'keluar',
    surat: SuratMasuk | SuratKeluar,
    action: 'view' | 'disposisi' | 'print' = 'view'
  ) => {
    if (type === 'masuk') {
      setCurrentTab('surat-masuk');
      if (action === 'disposisi') {
        setDisposisiSurat(surat as SuratMasuk);
      } else if (action === 'print') {
        setPrintConfig({ type: 'lembar-disposisi', surat: surat as SuratMasuk });
      }
    } else {
      setCurrentTab('surat-keluar');
      if (action === 'print') {
        setPrintConfig({ type: 'surat-resmi', surat: surat as SuratKeluar });
      }
    }
  };

  const scannedProctorMatch =
    typeof window !== 'undefined' && window.location.search.includes('jadwal-pengawas')
      ? resolveScannedProctorFromQuery(
          panitiaPengawasList,
          kartuPanitiaSettings.jadwalPengawasSlots || [],
          window.location.search
        )
      : { proctor: null, allProctors: [] };

  const [activeScannedProctor, setActiveScannedProctor] = useState<PanitiaPengawasItem | null>(
    null
  );

  if (scannedProctorMatch.proctor) {
    const displayedProctor = activeScannedProctor || scannedProctorMatch.proctor;
    return (
      <JadwalPengawasScanPortal
        proctor={displayedProctor}
        allProctors={scannedProctorMatch.allProctors}
        slots={kartuPanitiaSettings.jadwalPengawasSlots || []}
        profile={schoolProfile}
        settings={kartuPanitiaSettings}
        isStandalone
        onSelectProctor={item => {
          setActiveScannedProctor(item);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('no', item.nomorTugas);
            url.searchParams.set('nama', item.nama);
            url.searchParams.delete('s');
            window.history.replaceState({}, '', url.toString());
          }
        }}
      />
    );
  }

  const isStandaloneIjinUjian =
    typeof window !== 'undefined' &&
    (() => {
      const p = new URLSearchParams(window.location.search);
      const v = (p.get('view') || p.get('tab') || '').toLowerCase();
      return v === 'izin-ujian' || v === 'ijin-ujian';
    })();

  if (isStandaloneIjinUjian) {
    return (
      <SuratIjinMasukUjianView
        profile={schoolProfile}
        currentUser={currentUser}
        siswaList={siswaList}
        settings={kartuUjianSettings}
        panitiaPengawasList={panitiaPengawasList}
        onUpdateSiswa={handleUpdateSiswa}
        isStandalone
      />
    );
  }

  const isStandaloneStrukturOrg =
    typeof window !== 'undefined' &&
    (() => {
      const p = new URLSearchParams(window.location.search);
      const v = (p.get('view') || p.get('tab') || '').toLowerCase();
      return v === 'struktur-organisasi' || v === 'struktur';
    })();

  if (isStandaloneStrukturOrg) {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 print:bg-white print:p-0">
        <div className="max-w-7xl mx-auto print:max-w-none print:w-full">
          <StrukturOrganisasiView
            profile={schoolProfile}
            currentUser={currentUser}
            guruList={guruList}
            tendikList={tendikList}
            bundle={strukturBundle}
            fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
            fallbackStempelUrl={kartuUjianSettings.stempelUrl}
            isStandalone
            onUpdateBundle={handleUpdateStrukturBundle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans print:bg-white print:min-h-0">
      {/* Top Header Bar */}
      {!isFocusMode && (
        <Header
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          currentUser={currentUser}
          onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
          onQuickAdd={() => setCurrentTab('surat-masuk')}
          profile={schoolProfile}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          suratMasukList={suratMasukList}
          suratKeluarList={suratKeluarList}
          onSelectLetter={handleSelectLetterFromSearch}
        />
      )}

      {/* Dynamic Sub-Toolbar Strip */}
      <div className="no-print print:hidden bg-white border-b border-slate-200 px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-xs sticky top-0 md:static z-20">
        {/* Left: Dynamic Sliding Toggle & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            title={isSidebarOpen ? 'Sembunyikan menu samping' : 'Buka menu samping'}
            className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-all active:scale-95"
          >
            {isSidebarOpen ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-blue-600" />
                <span>Geser Tutup Samping</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold text-blue-900">Buka Menu Samping</span>
              </>
            )}
            <span className="text-[10px] font-mono text-slate-500 bg-white px-1 py-0.2 rounded border border-slate-200">
              B
            </span>
          </button>

          {/* Breadcrumb Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs">
            <span>SMAN 9 Surabaya</span>
            <span>/</span>
            <span className="font-semibold text-slate-900 capitalize">
              {currentTab.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Right: Dynamic Contextual Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dynamic Action depending on active tab */}
          {currentTab === 'surat-masuk' && (
            <button
              onClick={() => exportToCSV('masuk')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor CSV</span>
            </button>
          )}

          {currentTab === 'surat-keluar' && (
            <button
              onClick={() => exportToCSV('keluar')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Ekspor CSV</span>
            </button>
          )}

          {/* Quick Print Center Trigger */}
          <button
            onClick={() => setPrintConfig({ type: 'rekapitulasi', periodText: 'Bulan Berjalan 2026' })}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center gap-1.5 transition-colors"
            title="Cetak Cepat Dokumen Rekapitulasi"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Cetak Rekap</span>
          </button>

          {/* Web Address Button */}
          <button
            onClick={() => setIsWebAddressModalOpen(true)}
            className="px-2.5 py-1 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Lihat & Salin Alamat Web Aplikasi & Portal SMAN 9 Surabaya"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Alamat Web</span>
          </button>

          {/* Quick Email Backup Button */}
          <button
            onClick={handleQuickEmailBackup}
            className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md flex items-center gap-1.5 transition-colors"
            title="Kirim Snapshot Database ke surel smanixsurabaya@gmail.com"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Backup Email TU</span>
          </button>

          {/* Dynamic Focus Mode Toggle */}
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`p-1.5 rounded-md border transition-colors ${
              isFocusMode 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-300'
            }`}
            title={isFocusMode ? 'Keluar Mode Fokus' : 'Mode Layar Penuh Fokus Dokumen'}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative print:block print:overflow-visible">
        {/* Sidebar with slide toggle */}
        {!isFocusMode && (
          <Sidebar
            currentTab={currentTab}
            onNavigate={setCurrentTab}
            userRole={currentUser.role}
            isOpen={isSidebarOpen}
            onToggle={toggleSidebar}
            counts={counts}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 transition-all duration-300 print:overflow-visible print:p-0 print:bg-white">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full print:m-0">
            {/* View 1: Dashboard Overview */}
            {currentTab === 'dashboard' && (
              <DashboardOverview
                suratMasuk={suratMasukList}
                suratKeluar={suratKeluarList}
                currentUser={currentUser}
                schoolProfile={schoolProfile}
                onNavigate={setCurrentTab}
                onOpenInputMasuk={() => setCurrentTab('surat-masuk')}
                onOpenInputKeluar={() => setCurrentTab('surat-keluar')}
                onTriggerEmailBackup={handleQuickEmailBackup}
                onOpenPrintDisposisi={(surat) => setPrintConfig({ type: 'lembar-disposisi', surat })}
              />
            )}

            {/* View 2: Surat Masuk & Disposisi */}
            {currentTab === 'surat-masuk' && (
              <SuratMasukView
                suratList={suratMasukList}
                currentUser={currentUser}
                onSaveSurat={handleSaveSuratMasuk}
                onDeleteSurat={handleDeleteSuratMasuk}
                onOpenDisposisiModal={setDisposisiSurat}
                onPrintLembarDisposisi={(surat) => setPrintConfig({ type: 'lembar-disposisi', surat })}
                onExportCSV={() => exportToCSV('masuk')}
              />
            )}

            {/* View 3: Surat Keluar & Pengesahan */}
            {currentTab === 'surat-keluar' && (
              <SuratKeluarView
                suratList={suratKeluarList}
                currentUser={currentUser}
                schoolProfile={schoolProfile}
                onSaveSurat={handleSaveSuratKeluar}
                onDeleteSurat={handleDeleteSuratKeluar}
                onPrintSuratKeluar={(surat) => setPrintConfig({ type: 'surat-resmi', surat })}
                onExportCSV={() => exportToCSV('keluar')}
              />
            )}

            {/* View: Template & Generator Surat AI */}
            {currentTab === 'template-ai' && (
              <SuratGeneratorView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                guruList={guruList}
                tendikList={tendikList}
                templates={templates}
                onSaveTemplate={handleUpdateTemplates}
                onSaveToSuratKeluar={(surat) => handleSaveSuratKeluar(surat, true)}
                onOpenPrint={(surat) => setPrintConfig({ type: 'surat-resmi', surat })}
                initialSelection={letterPreSelection}
              />
            )}

            {/* View: Database Induk Siswa, Guru & Tendik */}
            {currentTab === 'master-data' && (
              <MasterDataView
                siswaList={siswaList}
                guruList={guruList}
                tendikList={tendikList}
                currentUser={currentUser}
                onUpdateSiswa={handleUpdateSiswa}
                onUpdateGuru={handleUpdateGuru}
                onUpdateTendik={handleUpdateTendik}
                onSelectForLetter={handleSelectForLetter}
                onOpenProfileCard={(gtkId) => {
                  setSelectedKartuGtkId(gtkId);
                  setCurrentTab('kartu-gtk');
                }}
              />
            )}

            {/* View: Kartu Master Data & Profil Guru dan Tendik */}
            {currentTab === 'kartu-gtk' && (
              <KartuMasterGtkView
                profile={schoolProfile}
                currentUser={currentUser}
                guruList={guruList}
                tendikList={tendikList}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
                initialSelectedGtkId={selectedKartuGtkId}
                onUpdateGuru={handleUpdateGuru}
                onUpdateTendik={handleUpdateTendik}
                onSelectForLetter={handleSelectForLetter}
              />
            )}

            {/* View: Struktur Organisasi Sekolah & Aturan Urutan */}
            {currentTab === 'struktur-organisasi' && (
              <StrukturOrganisasiView
                profile={schoolProfile}
                currentUser={currentUser}
                guruList={guruList}
                tendikList={tendikList}
                bundle={strukturBundle}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
                onUpdateBundle={handleUpdateStrukturBundle}
              />
            )}

            {/* View: Buku Induk Siswa & Repositori Kurikulum */}
            {currentTab === 'buku-induk' && (
              <BukuIndukSiswaView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
                onUpdateSiswa={handleUpdateSiswa}
              />
            )}

            {/* View: Detail Nilai Rapor Buku Induk Per Semester */}
            {currentTab === 'buku-induk-rapor' && (
              <BukuIndukRaporView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                guruList={guruList}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
              />
            )}

            {/* View: Kartu Peserta Ulangan */}
            {currentTab === 'kartu-ujian' && (
              <KartuUjianView
                siswaList={siswaList}
                profile={schoolProfile}
                settings={kartuUjianSettings}
                currentUser={currentUser}
                onUpdateSiswa={handleUpdateSiswa}
                onUpdateSettings={handleUpdateKartuUjianSettings}
                onSyncTypographyToAllCards={handleSyncCardTypographyToAll}
                onSyncDimensionsToAllCards={handleSyncCardDimensionsToAll}
              />
            )}

            {/* View: Kartu Panitia & Pengawas */}
            {currentTab === 'kartu-panitia' && (
              <KartuPanitiaPengawasView
                items={panitiaPengawasList}
                guruList={guruList}
                tendikList={tendikList}
                profile={schoolProfile}
                settings={kartuPanitiaSettings}
                currentUser={currentUser}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
                onUpdateItems={handleUpdatePanitiaPengawas}
                onUpdateSettings={handleUpdateKartuPanitiaSettings}
                onSyncTypographyToAllCards={handleSyncCardTypographyToAll}
                onSyncDimensionsToAllCards={handleSyncCardDimensionsToAll}
              />
            )}

            {/* View: Surat Ijin Masuk Ujian (siswa terlambat) */}
            {currentTab === 'izin-ujian' && (
              <SuratIjinMasukUjianView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                settings={kartuUjianSettings}
                panitiaPengawasList={panitiaPengawasList}
                onUpdateSiswa={handleUpdateSiswa}
              />
            )}

            {/* View: Setting Tempel Nomor Ruang Ujian per Kelompok Tingkat */}
            {currentTab === 'tempel-ruang' && (
              <TempelNomorRuangView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                ujianSettings={kartuUjianSettings}
                bundle={tempelRuangBundle}
                onUpdateBundle={handleUpdateTempelRuangBundle}
                onUpdateSiswa={handleUpdateSiswa}
                onUpdateUjianSettings={handleUpdateKartuUjianSettings}
              />
            )}

            {/* View: Denah Ruang Kelas & Ujian SMAN 9 Surabaya */}
            {currentTab === 'denah-ruang' && (
              <DenahRuangView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                ujianSettings={kartuUjianSettings}
                panitiaList={panitiaPengawasList}
              />
            )}

            {/* View: Daftar Hadir Ulangan Siswa & Pengawas Ruang */}
            {currentTab === 'daftar-hadir-ujian' && (
              <DaftarHadirUjianView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                ujianSettings={kartuUjianSettings}
                panitiaList={panitiaPengawasList}
                panitiaSettings={kartuPanitiaSettings}
                onUpdateSiswa={handleUpdateSiswa}
              />
            )}

            {/* View: Berita Acara Ulangan PSAS (Form Kosongan & Form Isian) */}
            {currentTab === 'berita-acara-ujian' && (
              <BeritaAcaraUjianView
                profile={schoolProfile}
                currentUser={currentUser}
                siswaList={siswaList}
                guruList={guruList}
                ujianSettings={kartuUjianSettings}
                panitiaList={panitiaPengawasList}
                panitiaSettings={kartuPanitiaSettings}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
              />
            )}

            {/* View: Kehadiran Guru & Karyawan (E-Presensi BKD) */}
            {currentTab === 'kehadiran-pegawai' && (
              <KehadiranPegawaiView
                profile={schoolProfile}
                currentUser={currentUser}
                guruList={guruList}
                tendikList={tendikList}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
              />
            )}

            {/* View: SKP & Pembaca Bukti Dukung */}
            {currentTab === 'skp-pegawai' && (
              <SkpPegawaiView
                profile={schoolProfile}
                currentUser={currentUser}
                guruList={guruList}
                tendikList={tendikList}
                fallbackTtdKsUrl={kartuUjianSettings.ttdKsUrl}
                fallbackStempelUrl={kartuUjianSettings.stempelUrl}
              />
            )}

            {/* View 4: Buku Agenda Persuratan */}
            {currentTab === 'buku-agenda' && (
              <BukuAgendaView
                suratMasuk={suratMasukList}
                suratKeluar={suratKeluarList}
                schoolProfile={schoolProfile}
                onPrintAgenda={(type, year, month) => {
                  setPrintConfig({
                    type: type === 'masuk' ? 'agenda-masuk' : 'agenda-keluar',
                    periodText: `Tahun ${year} (${month === 'all' ? 'Semua Bulan' : `Bulan ${month}`})`
                  });
                }}
                onExportCSV={(type) => exportToCSV(type)}
              />
            )}

            {/* View 5: Pusat Laporan & Percetakan */}
            {currentTab === 'laporan-cetak' && (
              <LaporanCetakView
                suratMasuk={suratMasukList}
                suratKeluar={suratKeluarList}
                schoolProfile={schoolProfile}
                currentUser={currentUser}
                onOpenPrintModal={setPrintConfig}
                onExportCSV={(type) => exportToCSV(type)}
              />
            )}

            {/* View 6: Backup, Export & Email Sync */}
            {currentTab === 'backup-restore' && (
              <BackupRestoreView
                schoolProfile={schoolProfile}
                currentUser={currentUser}
                backupHistory={backupHistory}
                onRefreshData={reloadAllData}
                onUpdateSchoolProfile={handleSaveSchoolProfile}
              />
            )}

            {/* View 7: Manajemen Hak Akses Pengguna */}
            {currentTab === 'manajemen-pengguna' && (
              <UserManagementView
                users={users}
                currentUser={currentUser}
                onSaveUser={handleSaveUser}
                onSwitchUser={handleSwitchUser}
              />
            )}

            {/* View 8: Profil Sekolah & Konfigurasi Kop Surat */}
            {currentTab === 'profil-sekolah' && (
              <SchoolProfileView
                profile={schoolProfile}
                currentUser={currentUser}
                onSaveProfile={handleSaveSchoolProfile}
              />
            )}

            {/* View 9: Log Aktivitas Audit */}
            {currentTab === 'audit-log' && (
              <AuditLogView
                logs={auditLogs}
                currentUser={currentUser}
              />
            )}
          </div>
        </main>
      </div>

      {/* Disposisi Sheet Modal */}
      {disposisiSurat && (
        <DisposisiModal
          surat={disposisiSurat}
          currentUser={currentUser}
          onClose={() => setDisposisiSurat(null)}
          onSaveDisposisi={handleSaveDisposisi}
          onPrintDisposisi={(surat) => {
            setDisposisiSurat(null);
            setPrintConfig({ type: 'lembar-disposisi', surat });
          }}
        />
      )}

      {/* Official Government Print Modal */}
      {printConfig && (
        <PrintModal
          config={printConfig}
          profile={schoolProfile}
          currentUser={currentUser}
          suratMasukList={suratMasukList}
          suratKeluarList={suratKeluarList}
          onClose={() => setPrintConfig(null)}
        />
      )}

      {/* User Switcher Modal for Easy Role Testing */}
      {isSwitchUserOpen && (
        <UserSwitcherModal
          users={users}
          currentUser={currentUser}
          onSelectUser={handleSwitchUser}
          onClose={() => setIsSwitchUserOpen(false)}
        />
      )}

      {/* Web Address & Access Modal */}
      <WebAddressModal
        isOpen={isWebAddressModalOpen}
        onClose={() => setIsWebAddressModalOpen(false)}
        profile={schoolProfile}
      />
    </div>
  );
}
