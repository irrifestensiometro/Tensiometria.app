import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LogOut, User as UserIcon, UserRound } from 'lucide-react';

type ProfileRole = 'agronomo' | 'produtor';

export default function ProfileMenu({ roleLabel, role }: { roleLabel: string; role: ProfileRole }) {
  const { currentUser, logout } = useAppContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Abrir perfil"
          className="rounded-full border border-slate-200 bg-slate-100 p-2.5 text-slate-600 transition-colors hover:bg-slate-200"
          title="Perfil"
        >
          <UserIcon size={20} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-[1100] mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-4">
            <p className="truncate font-bold text-slate-800">{currentUser?.nome}</p>
            <p className="truncate text-sm text-slate-500">{currentUser?.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-400">
              {roleLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(`/${role}/perfil`);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <UserRound size={16} />
            <span>Perfil</span>
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}
