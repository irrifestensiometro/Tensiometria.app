import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Save, UserRound } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { alterarSenhaAgronomo } from '../lib/authService';
import { formatarCpf, normalizarCpf } from '../lib/cpf';

export default function Profile({ role }: { role: 'agronomo' | 'produtor' }) {
  const {
    currentUser,
    updateAccountProfile,
  } = useAppContext();
  const [name, setName] = useState(currentUser?.nome ?? '');
  const [cpf, setCpf] = useState(currentUser?.cpf ?? '');
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setName(currentUser?.nome ?? '');
    setCpf(currentUser?.cpf ?? '');
  }, [currentUser?.nome, currentUser?.cpf]);

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');
    setSavingProfile(true);
    try {
      await updateAccountProfile(name, role === 'produtor' ? cpf : undefined);
      setProfileMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwords.next.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('As novas senhas não coincidem.');
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
      setPasswordMessage('Senha alterada com sucesso.');
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

  const dashboardPath = role === 'produtor' ? '/produtor/dashboard' : '/agronomo/dashboard';
  const accent = role === 'produtor' ? '#b57d59' : '#356b46';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 animate-in fade-in duration-300">
      <Link
        to={dashboardPath}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Voltar ao painel
      </Link>

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: accent }}>
            <UserRound size={23} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meu perfil</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie seus dados de acesso e identificação.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Dados da conta</h2>
        <form onSubmit={(event) => void handleSaveProfile(event)} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Nome completo
            <input
              required
              maxLength={120}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            E-mail
            <input
              readOnly
              value={currentUser?.email ?? ''}
              className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-normal text-slate-500"
            />
          </label>
          {role === 'produtor' && (
            <label className="block text-sm font-semibold text-slate-700">
              CPF (opcional)
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                value={formatarCpf(cpf)}
                onChange={(event) => setCpf(normalizarCpf(event.target.value).slice(0, 11))}
                placeholder="000.000.000-00"
                aria-describedby="profile-cpf-note"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none transition focus:border-[#b57d59] focus:ring-2 focus:ring-orange-100"
              />
              <span id="profile-cpf-note" className="mt-1 block text-xs font-normal text-slate-500">
                O CPF facilita a identificação do seu perfil pelos agrônomos.
              </span>
            </label>
          )}
          {profileError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}
          {profileMessage && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{profileMessage}</p>}
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            <Save size={17} />
            {savingProfile ? 'Salvando...' : 'Salvar dados'}
          </button>
        </form>
      </section>

      {role === 'agronomo' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-emerald-800" />
            <h2 className="text-lg font-bold text-slate-900">Alterar senha</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">Confirme a senha atual para cadastrar uma nova senha.</p>
          <form onSubmit={(event) => void handleChangePassword(event)} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Senha atual
              <input
                required
                type="password"
                autoComplete="current-password"
                value={passwords.current}
                onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Nova senha
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={passwords.next}
                  onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
            {passwordError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{passwordError}</p>}
            {passwordMessage && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{passwordMessage}</p>}
            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#356b46] px-5 py-3 font-bold text-white transition-colors hover:bg-[#2a5538] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={17} />
              {changingPassword ? 'Alterando senha...' : 'Salvar nova senha'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
