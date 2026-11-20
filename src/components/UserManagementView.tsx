import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  KeyRound, 
  Check, 
  X, 
  UserX, 
  UserCheck, 
  Lock,
  Shield,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface UserManagementViewProps {
  users: User[];
  currentUser: User;
  onSaveUser: (user: User, isNew: boolean) => void;
  onSwitchUser: (user: User) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onSaveUser,
  onSwitchUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [role, setRole] = useState<UserRole>('staf_agenda');
  const [jabatan, setJabatan] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('123456');

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setName('');
    setNip('');
    setRole('staf_agenda');
    setJabatan('Staf Administrasi Persuratan');
    setEmail('');
    setPin('123456');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setName(user.name);
    setNip(user.nip);
    setRole(user.role);
    setJabatan(user.jabatan);
    setEmail(user.email);
    setPin(user.pin);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Anda tidak dapat menonaktifkan akun yang sedang digunakan saat ini.');
      return;
    }
    const updated = { ...user, isActive: !user.isActive };
    onSaveUser(updated, false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      alert('Lengkapi nama dan username pengguna.');
      return;
    }

    const isNew = !editingUser;
    const userToSave: User = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      username: username.trim().toLowerCase(),
      name: name.trim(),
      nip: nip.trim(),
      role,
      jabatan: jabatan.trim(),
      email: email.trim(),
      isActive: editingUser ? editingUser.isActive : true,
      pin: pin.trim() || '123456'
    };

    onSaveUser(userToSave, isNew);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Manajemen Pengguna & Pengendalian Hak Akses Dokumen
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan peran (RBAC), otorisasi disposisi, pengesahan surat keluar, dan proteksi integritas persuratan SMAN 9 Surabaya.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Pegawai</span>
        </button>
      </div>

      {/* Role Matrix Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Matriks Hak Akses Terintegrasi (Role-Based Access Control)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded">
            <span className="font-bold text-blue-950 block">Kepala TU (Admin)</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Akses Penuh: CRUD semua surat, hapus arsip, backup & restore database, manajemen akun, audit log.
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded">
            <span className="font-bold text-amber-950 block">Staf Agenda TU</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Operasional: Input surat masuk & keluar, cetak lembar disposisi, cetak agenda, unduh backup CSV/JSON.
            </p>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded">
            <span className="font-bold text-purple-950 block">Kepala Sekolah</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Pimpinan: Memberikan disposisi tertulis, persetujuan (ACC/Sign) surat dinas keluar, laporan eksekutif.
            </p>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded">
            <span className="font-bold text-emerald-950 block">Wakil Kepala Sekolah</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Pelaksana: Melihat surat yang didisposisikan, memperbarui status tindak lanjut instruksi kedinasan.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="font-bold text-slate-900 block">Guru / Karyawan</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Pemberitahuan: Melihat arsip edaran dinas terbuka, undangan resmi sekolah, dan jadwal kegiatan.
            </p>
          </div>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Daftar Pengguna Aktif Sistem Persuratan ({users.length} Akun)
          </h3>
          <span className="text-xs text-slate-500">
            Klik tombol "Beralih Sesi" untuk menguji hak akses masing-masing peran
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold select-none">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Nama & NIP Pegawai</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Jabatan Kedinasan</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Username</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Peran Sistem</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Status Akun</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Aksi / Uji Peran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => {
                const isCurrent = user.id === currentUser.id;
                return (
                  <tr key={user.id} className={isCurrent ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-blue-700 font-medium bg-blue-100 px-1.5 py-0.2 rounded">
                            Sesi Anda
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {user.nip ? `NIP. ${user.nip}` : 'Non-PNS / Staf Kontrak'}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {user.jabatan}
                    </td>

                    <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {user.username}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`font-semibold text-[11px] ${
                        user.role === 'admin_tu' ? 'text-blue-700' :
                        user.role === 'kepala_sekolah' ? 'text-purple-700' :
                        user.role === 'staf_agenda' ? 'text-amber-700' :
                        user.role === 'wakasek' ? 'text-emerald-700' : 'text-slate-600'
                      }`}>
                        {user.role === 'admin_tu' ? 'Kepala TU (Admin)' :
                         user.role === 'kepala_sekolah' ? 'Kepala Sekolah' :
                         user.role === 'staf_agenda' ? 'Staf Agenda TU' :
                         user.role === 'wakasek' ? 'Wakasek' : 'Guru / Staf'}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`font-semibold text-[11px] ${user.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Switch Account Quick Action */}
                        <button
                          onClick={() => onSwitchUser(user)}
                          disabled={isCurrent}
                          title="Beralih ke akun ini untuk simulasi hak akses"
                          className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isCurrent ? 'Aktif' : 'Beralih Sesi'}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit Pengguna"
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded border border-slate-200"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(user)}
                          title={user.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded border border-slate-200"
                        >
                          {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="text-base font-bold text-white">
                {editingUser ? `Edit Akun: ${editingUser.name}` : 'Tambah Akun Pegawai Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nama Lengkap & Gelar *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dra. Hj. Sri Rahayu"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Username Login *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: srirahayu"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    NIP Pegawai:
                  </label>
                  <input
                    type="text"
                    placeholder="197405121999032001"
                    value={nip}
                    onChange={e => setNip(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Peran / Hak Akses (Role):
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="admin_tu">Kepala TU (Admin)</option>
                    <option value="staf_agenda">Staf Agenda TU</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="wakasek">Wakil Kepala Sekolah</option>
                    <option value="guru_staf">Guru / Staf Pegawai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    PIN Keamanan (6 Digit):
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono text-center tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Jabatan Kedinasan:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kepala Urusan Tata Usaha"
                  value={jabatan}
                  onChange={e => setJabatan(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Surel (Email) Pegawai:
                </label>
                <input
                  type="email"
                  placeholder="pegawai@sman9surabaya.sch.id"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
