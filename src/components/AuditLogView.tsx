import React, { useState } from 'react';
import { AuditLog, User } from '../types';
import { FileText, Search, Shield, Filter } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLog[];
  currentUser: User;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = logs.filter(log => {
    const matchQuery = 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchQuery && matchAction;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Jejak Audit & Log Keamanan Dokumen Persuratan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan aktivitas sistem yang tidak dapat diubah (tamper-evident) untuk akuntabilitas operasional kearsipan SMAN 9 Surabaya.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded text-xs text-slate-700 font-mono">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          <span>{logs.length} Rekaman Audit Terdaftar</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pegawai, aksi, atau rincian log..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Filter Aksi:</span>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
          >
            <option value="all">Semua Jenis Aksi</option>
            <option value="LOGIN_SISTEM">Login Sistem</option>
            <option value="TAMBAH_SURAT_MASUK">Tambah Surat Masuk</option>
            <option value="INPUT_DISPOSISI">Input Disposisi</option>
            <option value="ACC_SURAT_KELUAR">ACC Surat Keluar</option>
            <option value="BACKUP_DATABASE_LOKAL">Backup Lokal</option>
            <option value="BACKUP_DATABASE_EMAIL">Backup Email</option>
            <option value="RESTORE_DATABASE">Restore Database</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold select-none">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Waktu Kejadian</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Pegawai / Operator</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Peran</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Kode Aksi</th>
                <th className="py-2.5 px-4">Deskripsi Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">
                    Tidak ada rekaman log yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-4 font-sans whitespace-nowrap">
                      <span className={`text-[10px] font-semibold ${
                        log.role === 'admin_tu' ? 'text-blue-700' :
                        log.role === 'kepala_sekolah' ? 'text-purple-700' :
                        log.role === 'staf_agenda' ? 'text-amber-700' : 'text-slate-600'
                      }`}>
                        {log.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-700">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-sans">
          <span>Menampilkan {filteredLogs.length} dari {logs.length} catatan aktivitas</span>
          <span className="font-mono text-[11px]">SIP-TU SMAN 9 Surabaya Audit Log</span>
        </div>
      </div>
    </div>
  );
};
