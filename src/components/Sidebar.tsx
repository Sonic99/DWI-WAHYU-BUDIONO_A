import React from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  Send, 
  BookOpen, 
  Printer, 
  Database, 
  Users, 
  Building2, 
  FileText,
  ShieldCheck,
  Mail,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Sparkles,
  GraduationCap,
  IdCard,
  BadgeCheck
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  userRole: UserRole;
  isOpen: boolean;
  onToggle: () => void;
  counts: {
    suratMasuk: number;
    suratKeluar: number;
    disposisiPending: number;
    reviewPending: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  userRole,
  isOpen,
  onToggle,
  counts
}) => {
  const isAllowed = (roles: UserRole[]) => roles.includes(userRole);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Ringkasan Eksekutif',
      shortLabel: 'Beranda',
      icon: LayoutDashboard,
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek', 'guru_staf'] as UserRole[]
    },
    {
      id: 'surat-masuk',
      label: 'Surat Masuk & Disposisi',
      shortLabel: 'Masuk',
      icon: Inbox,
      badge: counts.disposisiPending > 0 ? `${counts.disposisiPending}` : undefined,
      badgeFull: counts.disposisiPending > 0 ? `${counts.disposisiPending} butuh disposisi` : undefined,
      badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-800',
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek', 'guru_staf'] as UserRole[]
    },
    {
      id: 'surat-keluar',
      label: 'Surat Keluar & Draf',
      shortLabel: 'Keluar',
      icon: Send,
      badge: counts.reviewPending > 0 ? `${counts.reviewPending}` : undefined,
      badgeFull: counts.reviewPending > 0 ? `${counts.reviewPending} draf` : undefined,
      badgeColor: 'text-blue-400 bg-blue-950/80 border-blue-800',
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek'] as UserRole[]
    },
    {
      id: 'template-ai',
      label: 'Template & AI Ragam Surat',
      shortLabel: 'AI Surat',
      icon: Sparkles,
      badgeFull: 'Gemini AI',
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek', 'guru_staf'] as UserRole[]
    },
    {
      id: 'master-data',
      label: 'Database Siswa, Guru & Tendik',
      shortLabel: 'Master Data',
      icon: GraduationCap,
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek'] as UserRole[]
    },
    {
      id: 'kartu-ujian',
      label: 'Kartu Peserta Ulangan',
      shortLabel: 'Kartu Ujian',
      icon: IdCard,
      badgeFull: 'Foto & TTD',
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek', 'guru_staf'] as UserRole[]
    },
    {
      id: 'kartu-panitia',
      label: 'Kartu Panitia & Pengawas',
      shortLabel: 'Panitia',
      icon: BadgeCheck,
      badgeFull: 'ID Petugas',
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek', 'guru_staf'] as UserRole[]
    },
    {
      id: 'buku-agenda',
      label: 'Buku Agenda Persuratan',
      shortLabel: 'Agenda',
      icon: BookOpen,
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek'] as UserRole[]
    },
    {
      id: 'laporan-cetak',
      label: 'Pusat Pelaporan & Cetak',
      shortLabel: 'Cetak',
      icon: Printer,
      roles: ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek', 'guru_staf'] as UserRole[]
    },
    {
      id: 'backup-restore',
      label: 'Backup, Export & Email',
      shortLabel: 'Backup',
      icon: Database,
      badgeFull: 'Lokal & Email',
      roles: ['admin_tu', 'staf_agenda'] as UserRole[]
    },
    {
      id: 'manajemen-pengguna',
      label: 'Manajemen Hak Akses',
      shortLabel: 'Akses',
      icon: Users,
      roles: ['admin_tu'] as UserRole[]
    },
    {
      id: 'profil-sekolah',
      label: 'Profil & Konfigurasi Kop',
      shortLabel: 'Profil',
      icon: Building2,
      roles: ['admin_tu'] as UserRole[]
    },
    {
      id: 'audit-log',
      label: 'Log Aktivitas & Keamanan',
      shortLabel: 'Audit',
      icon: FileText,
      roles: ['admin_tu'] as UserRole[]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay (Strictly hidden during print) */}
      {isOpen && (
        <div 
          onClick={onToggle}
          className="no-print print:hidden fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Collapsible Sidebar */}
      <aside 
        className={`no-print print:hidden relative z-30 shrink-0 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between select-none transition-all duration-300 ease-in-out ${
          isOpen ? 'w-64' : 'w-18'
        } ${
          // On mobile: off-canvas drawer
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Floating Dynamic Edge Toggle Button */}
        <button
          onClick={onToggle}
          title={isOpen ? 'Ciutkan Menu Samping (B)' : 'Perluas Menu Samping (B)'}
          className="hidden md:flex absolute -right-3.5 top-5 z-40 w-7 h-7 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 rounded-full shadow-md items-center justify-center transition-all hover:scale-105 active:scale-95 group"
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          ) : (
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          )}
        </button>

        {/* Top Navigation Items */}
        <div className="py-4 px-2 space-y-4 overflow-y-auto">
          {/* Section Title (Only in Expanded Mode) */}
          {isOpen ? (
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center justify-between">
              <span>Menu Tata Usaha</span>
              <span className="text-[9px] font-mono bg-slate-800 text-amber-400 px-1 py-0.5 rounded">
                SMANIX
              </span>
            </div>
          ) : (
            <div className="h-4 flex items-center justify-center">
              <div className="w-5 h-0.5 bg-slate-800 rounded"></div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.filter(item => isAllowed(item.roles)).map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center rounded-lg transition-all ${
                      isOpen
                        ? 'justify-between px-3 py-2 text-xs font-medium'
                        : 'justify-center p-2.5 text-xs'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-400'
                      }`} />
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </div>

                    {isOpen && item.badgeFull && (
                      <span className="text-[10px] text-slate-300 font-mono pl-1 shrink-0">
                        {item.badgeFull}
                      </span>
                    )}

                    {/* Dot Badge in Collapsed Mode */}
                    {!isOpen && item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>

                  {/* Floating Tooltip in Collapsed Mode */}
                  {!isOpen && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-mono text-amber-400 bg-slate-800 px-1 rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Status Indicators & Dynamic Mode Toggle */}
        <div className="p-3 border-t border-slate-800 space-y-3 bg-slate-900/50">
          {isOpen ? (
            <>
              {/* Security & Web Status in Expanded Mode */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate text-[11px]">Database Lokal Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate text-[11px]">smanixsurabaya@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <a 
                    href="https://sman9surabaya.sch.id" 
                    target="_blank" 
                    rel="noreferrer"
                    className="truncate text-[11px] hover:text-white hover:underline text-slate-300"
                    title="Website resmi SMAN 9 Surabaya"
                  >
                    sman9surabaya.sch.id
                  </a>
                </div>
              </div>

              {/* Dynamic Collapse Button */}
              <button
                onClick={onToggle}
                className="w-full py-1.5 px-2 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-md border border-slate-700/60 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PanelLeftClose className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sembunyikan Menu</span>
                </div>
                <span className="font-mono text-[9px] bg-slate-900 text-slate-400 px-1 rounded">
                  Ctrl+B
                </span>
              </button>
            </>
          ) : (
            // Collapsed Bottom Tooltips
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onToggle}
                title="Buka Menu Samping Penuh"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors group relative"
              >
                <PanelLeftOpen className="w-4 h-4 text-amber-400" />
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2 py-1 bg-slate-950 text-white text-[11px] rounded shadow-lg border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Perluas Menu
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
