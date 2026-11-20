import React, { useState, useRef, useEffect } from 'react';
import { User, SchoolProfile, SuratMasuk, SuratKeluar } from '../types';
import { 
  ShieldCheck, 
  Plus, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Search, 
  X, 
  Inbox, 
  Send, 
  Printer, 
  FileCheck2, 
  ArrowRight,
  Command,
  FileText
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  currentUser: User;
  onOpenSwitchUser: () => void;
  onQuickAdd: () => void;
  profile: SchoolProfile;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  suratMasukList: SuratMasuk[];
  suratKeluarList: SuratKeluar[];
  onSelectLetter: (type: 'masuk' | 'keluar', surat: SuratMasuk | SuratKeluar, action?: 'view' | 'disposisi' | 'print') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onOpenSwitchUser,
  onQuickAdd,
  profile,
  isSidebarOpen,
  onToggleSidebar,
  suratMasukList,
  suratKeluarList,
  onSelectLetter
}) => {
  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside listener to close search results dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut (Ctrl+K or Cmd+K or /) to focus global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search results filtering
  const query = searchQuery.trim().toLowerCase();
  
  const matchedSuratMasuk = query.length > 0 ? suratMasukList.filter(s => 
    s.nomorSurat.toLowerCase().includes(query) ||
    s.perihal.toLowerCase().includes(query) ||
    s.pengirim.toLowerCase().includes(query) ||
    s.nomorAgenda.toLowerCase().includes(query) ||
    (s.ringkasan && s.ringkasan.toLowerCase().includes(query))
  ) : [];

  const matchedSuratKeluar = query.length > 0 ? suratKeluarList.filter(s => 
    s.nomorSurat.toLowerCase().includes(query) ||
    s.perihal.toLowerCase().includes(query) ||
    s.tujuan.toLowerCase().includes(query) ||
    s.nomorAgenda.toLowerCase().includes(query) ||
    (s.isiRingkas && s.isiRingkas.toLowerCase().includes(query))
  ) : [];

  const totalResults = matchedSuratMasuk.length + matchedSuratKeluar.length;

  const handleItemClick = (type: 'masuk' | 'keluar', surat: SuratMasuk | SuratKeluar, action: 'view' | 'disposisi' | 'print' = 'view') => {
    onSelectLetter(type, surat, action);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="no-print print:hidden sticky top-0 z-40 flex items-center justify-between gap-3 md:gap-6 px-4 md:px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-white select-none shadow-md backdrop-blur-md">
      {/* Zone 1: Sidebar Toggle Button + Wordmark Brand */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Sembunyikan menu samping (Geser Tutup)' : 'Tampilkan menu samping (Geser Buka)'}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition-all flex items-center justify-center group active:scale-95 shadow-xs"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-0.5" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-0.5" />
          )}
        </button>

        {/* Wordmark Logo */}
        <div 
          onClick={() => onNavigate('dashboard')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs md:text-sm shadow-md group-hover:shadow-amber-500/20 transition-all">
            9
          </div>
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
              SIP-TU SMAN 9
            </span>
            <span className="text-[9px] md:text-[10px] text-slate-400 leading-none hidden sm:inline">
              Surabaya
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Global Search Input with Categorized Results Dropdown */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-lg mx-2 md:mx-4">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Cari surat (no surat, perihal, pengirim, agenda)..."
            className="w-full pl-9 pr-16 py-1.5 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-950 text-white placeholder-slate-400 text-xs rounded-lg border border-slate-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
          />

          <div className="absolute right-2.5 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 text-slate-400 hover:text-white rounded"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                <Command className="w-2.5 h-2.5" />K
              </span>
            )}
          </div>
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && query.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 text-xs">
            {/* Header info */}
            <div className="px-3.5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Hasil pencarian untuk <strong className="text-white">"{searchQuery}"</strong>:
              </span>
              <span className="font-mono text-amber-400 font-semibold">
                {totalResults} surat ditemukan
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
              {totalResults === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-1">
                  <p className="font-medium text-slate-300">Tidak ada surat yang cocok</p>
                  <p className="text-[11px] text-slate-500">
                    Coba gunakan kata kunci nomor surat, nama instansi pengirim, perihal, atau nomor agenda.
                  </p>
                </div>
              ) : (
                <>
                  {/* Category 1: Surat Masuk */}
                  {matchedSuratMasuk.length > 0 && (
                    <div className="p-2 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <Inbox className="w-3 h-3" />
                        <span>Surat Masuk ({matchedSuratMasuk.length})</span>
                      </div>

                      {matchedSuratMasuk.map((surat) => (
                        <div
                          key={surat.id}
                          className="p-2.5 rounded-md hover:bg-slate-800 transition-colors flex items-start justify-between gap-3 group"
                        >
                          <div 
                            onClick={() => handleItemClick('masuk', surat, 'view')}
                            className="flex-1 min-w-0 cursor-pointer space-y-0.5"
                          >
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                              <span className="font-bold text-amber-400">{surat.nomorAgenda}</span>
                              <span>·</span>
                              <span>{surat.tanggalTerima}</span>
                              <span>·</span>
                              <span className="text-slate-300 font-sans">{surat.sifat}</span>
                            </div>
                            <div className="font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                              {surat.perihal}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                              <span className="text-slate-300">Pengirim: {surat.pengirim}</span>
                              <span>·</span>
                              <span className="font-mono text-slate-400">No: {surat.nomorSurat}</span>
                            </div>
                          </div>

                          {/* Quick Action buttons */}
                          <div className="flex items-center gap-1 shrink-0 pt-1">
                            <button
                              onClick={() => handleItemClick('masuk', surat, 'disposisi')}
                              title="Buka / Atur Disposisi"
                              className="px-2 py-1 text-[10px] font-medium text-blue-400 hover:text-white bg-blue-950/70 hover:bg-blue-600 rounded border border-blue-800/80 transition-colors flex items-center gap-1"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Disposisi</span>
                            </button>
                            <button
                              onClick={() => handleItemClick('masuk', surat, 'print')}
                              title="Cetak Lembar Disposisi"
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category 2: Surat Keluar */}
                  {matchedSuratKeluar.length > 0 && (
                    <div className="p-2 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Send className="w-3 h-3" />
                        <span>Surat Keluar ({matchedSuratKeluar.length})</span>
                      </div>

                      {matchedSuratKeluar.map((surat) => (
                        <div
                          key={surat.id}
                          className="p-2.5 rounded-md hover:bg-slate-800 transition-colors flex items-start justify-between gap-3 group"
                        >
                          <div 
                            onClick={() => handleItemClick('keluar', surat, 'view')}
                            className="flex-1 min-w-0 cursor-pointer space-y-0.5"
                          >
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                              <span className="font-bold text-amber-400">{surat.nomorAgenda}</span>
                              <span>·</span>
                              <span>{surat.tanggalSurat}</span>
                              <span>·</span>
                              <span className="text-emerald-400 font-sans font-medium">{surat.status}</span>
                            </div>
                            <div className="font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                              {surat.perihal}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                              <span className="text-slate-300">Tujuan: {surat.tujuan}</span>
                              <span>·</span>
                              <span className="font-mono text-slate-400">No: {surat.nomorSurat}</span>
                            </div>
                          </div>

                          {/* Quick Action buttons */}
                          <div className="flex items-center gap-1 shrink-0 pt-1">
                            <button
                              onClick={() => handleItemClick('keluar', surat, 'print')}
                              title="Cetak Surat Dinas Resmi"
                              className="px-2 py-1 text-[10px] font-medium text-amber-400 hover:text-slate-950 bg-amber-950/60 hover:bg-amber-400 rounded border border-amber-800/80 transition-colors flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span className="hidden sm:inline">Cetak</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer with hint */}
            <div className="px-3.5 py-1.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Klik hasil untuk membuka detail surat</span>
              <span>Tekan <kbd className="font-mono bg-slate-800 px-1 py-0.2 rounded text-slate-300">ESC</kbd> untuk menutup</span>
            </div>
          </div>
        )}
      </div>

      {/* Zone 3: Navigation Links (Desktop) */}
      <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-300 shrink-0">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
            currentTab === 'dashboard' ? 'text-white border-amber-500 font-semibold' : 'border-transparent text-slate-300'
          }`}
        >
          Beranda
        </button>
        <button
          onClick={() => onNavigate('surat-masuk')}
          className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
            currentTab === 'surat-masuk' ? 'text-white border-amber-500 font-semibold' : 'border-transparent text-slate-300'
          }`}
        >
          Surat Masuk
        </button>
        <button
          onClick={() => onNavigate('surat-keluar')}
          className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
            currentTab === 'surat-keluar' ? 'text-white border-amber-500 font-semibold' : 'border-transparent text-slate-300'
          }`}
        >
          Surat Keluar
        </button>
        <button
          onClick={() => onNavigate('buku-agenda')}
          className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
            currentTab === 'buku-agenda' ? 'text-white border-amber-500 font-semibold' : 'border-transparent text-slate-300'
          }`}
        >
          Agenda
        </button>
        <button
          onClick={() => onNavigate('laporan-cetak')}
          className={`hover:text-white transition-colors whitespace-nowrap pb-0.5 border-b-2 ${
            currentTab === 'laporan-cetak' ? 'text-white border-amber-500 font-semibold' : 'border-transparent text-slate-300'
          }`}
        >
          Laporan
        </button>
      </nav>

      {/* Zone 4: Dynamic User Role & Primary Actions */}
      <div className="flex items-center gap-2 md:gap-2.5 shrink-0">
        {/* User Role Switcher Trigger */}
        <button
          onClick={onOpenSwitchUser}
          title="Klik untuk beralih hak akses / akun"
          className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="max-w-[85px] md:max-w-[120px] truncate">{currentUser.name}</span>
          <span className="text-[9px] md:text-[10px] text-amber-400 font-mono uppercase bg-slate-900 px-1 py-0.5 rounded">
            {currentUser.role === 'admin_tu' ? 'Admin TU' :
             currentUser.role === 'kepala_sekolah' ? 'Kepsek' :
             currentUser.role === 'staf_agenda' ? 'Agenda' :
             currentUser.role === 'wakasek' ? 'Wakasek' : 'Guru'}
          </span>
        </button>

        {/* Primary CTA */}
        {(currentUser.role === 'admin_tu' || currentUser.role === 'staf_agenda') && (
          <button
            onClick={onQuickAdd}
            className="flex items-center gap-1 px-2.5 md:px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Registrasi</span>
          </button>
        )}
      </div>
    </header>
  );
};
