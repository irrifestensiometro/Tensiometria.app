import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { User as UserIcon, LogOut } from 'lucide-react';

export default function ProfileMenu({ roleLabel }: { roleLabel: string }) {
  const { currentUser, logout } = useAppContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center space-x-3 text-right">
        <div className="hidden md:block">
          <p className="text-sm font-bold text-slate-800">{currentUser?.nome}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition-colors border border-slate-200 text-slate-600"
          title="Perfil"
        >
          <UserIcon size={20} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100">
            <p className="font-bold text-slate-800 truncate">{currentUser?.nome}</p>
            <p className="text-sm text-slate-500 truncate">{currentUser?.email}</p>
            <span className="inline-block mt-1.5 text-[11px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {roleLabel}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}
