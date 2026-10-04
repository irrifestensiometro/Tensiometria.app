import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { KeyRound, LogOut, User as UserIcon, X } from 'lucide-react';
import { alterarSenhaAgronomo } from '../lib/authService';

type ProfileRole = 'agronomo' | 'produtor';

export default function ProfileMenu({ roleLabel, role }: { roleLabel: string; role?: ProfileRole }) {
  const { currentUser, logout } = useAppContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
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

  const closePasswordDialog = () => {
    setShowChangePassword(false);
    setPasswords({ current: '', next: '', confirm: '' });
    setPasswordError('');
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    if (passwords.next !== passwords.confirm) {
      setPasswordError('As senhas novas não coincidem.');
      return;
    }
    if (passwords.next === passwords.current) {
      setPasswordError('A nova senha precisa ser diferente da senha atual.');
      return;
    }

    setChangingPassword(true);
    try {
      await alterarSenhaAgronomo(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setShowChangePassword(false);
      setPasswordChanged(true);
      setOpen(true);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError('A senha atual está incorreta.');
      } else if (code === 'auth/weak-password') {
        setPasswordError('A senha nova deve ter pelo menos 6 caracteres.');
      } else {
        setPasswordError(error instanceof Error ? error.message : 'Não foi possível alterar a senha.');
      }
    } finally {
      setChangingPassword(false);
    }
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
          aria-expanded={open}
          aria-label="Abrir perfil"
          className="bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition-colors border border-slate-200 text-slate-600"
          title="Perfil"
        >
          <UserIcon size={20} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-[1100] mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="p-4 border-b border-slate-100">
            <p className="font-bold text-slate-800 truncate">{currentUser?.nome}</p>
            <p className="text-sm text-slate-500 truncate">{currentUser?.email}</p>
            <span className="inline-block mt-1.5 text-[11px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {roleLabel}
            </span>
          </div>
          {passwordChanged && (
            <div role="status" className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Senha alterada com sucesso.
            </div>
          )}
          {role === 'agronomo' && (
            <button
              onClick={() => {
                setPasswordError('');
                setPasswordChanged(false);
                setPasswords({ current: '', next: '', confirm: '' });
                setOpen(false);
                setShowChangePassword(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <KeyRound size={16} />
              <span>Alterar senha</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      )}
      {showChangePassword && role === 'agronomo' && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="change-password-title" className="text-lg font-bold text-slate-900">Alterar senha</h2>
                <p className="mt-1 text-sm text-slate-500">Confirme sua senha atual para continuar.</p>
              </div>
              <button
                type="button"
                onClick={closePasswordDialog}
                aria-label="Fechar"
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4 p-5 sm:p-6">
              {passwordError && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {passwordError}
                </div>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Senha atual
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={passwords.current}
                  onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Nova senha
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={passwords.next}
                  onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Confirmar nova senha
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={passwords.confirm}
                  onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full rounded-xl bg-[#356b46] px-4 py-3 font-bold text-white transition-colors hover:bg-[#2a5538] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {changingPassword ? 'Alterando senha...' : 'Salvar nova senha'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
