import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, X, Check, Lock } from 'lucide-react';

interface UserSwitcherModalProps {
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  users,
  currentUser,
  onSelectUser,
  onClose
}) => {
  const [selectedUser, setSelectedUser] = useState<User>(currentUser);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleConfirm = () => {
    // If selecting same user, just close
    if (selectedUser.id === currentUser.id) {
      onClose();
      return;
    }

    // Verify PIN (default is '123456')
    if (enteredPin !== selectedUser.pin && enteredPin !== '123456') {
      setPinError(true);
      return;
    }

    onSelectUser(selectedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold">Beralih Hak Akses Pengguna</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600">
            Pilihlah akun pegawai untuk menguji hak akses otorisasi persuratan SMAN 9 Surabaya:
          </p>

          <div className="space-y-2">
            {users.map(u => {
              const isSelected = selectedUser.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setPinError(false);
                    setEnteredPin(u.pin || '123456'); // Pre-fill default PIN for seamless testing
                  }}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/60' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-500">{u.jabatan}</div>
                    <div className="text-[10px] font-mono text-blue-700 font-semibold mt-0.5">
                      Peran: {u.role.toUpperCase()} {u.nip ? `· NIP. ${u.nip}` : ''}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Konfirmasi PIN Pengguna (Bawaan: 123456):
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                maxLength={6}
                value={enteredPin}
                onChange={e => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-center tracking-widest font-mono text-xs focus:ring-1 focus:ring-blue-500"
                placeholder="123456"
              />
            </div>
            {pinError && (
              <p className="text-[11px] text-red-600 mt-1">
                PIN tidak sesuai. Gunakan PIN bawaan: 123456
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs"
            >
              Masuk Sesi {selectedUser.name.split(' ')[0]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
