import { useState, type FormEvent } from 'react';
import { KeyRound, Tractor, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatarCpf, normalizarCpf } from '../lib/cpf';

export function FirstLoginPrompts() {
  const {
    currentUser,
    loading,
    userRole,
    mustChangePassword,
    shouldAskCpf,
    trocarSenhaInicial,
    concluirCadastroCpf,
  } = useAppContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading || !currentUser) return null;

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setSaving(true);
    try {
      await trocarSenhaInicial(password);
      setPassword('');
      setConfirmPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.');
    } finally {
      setSaving(false);
    }
  };

  const completeCpfSetup = async (value?: string) => {
    setError('');
    setSaving(true);
    try {
      await concluirCadastroCpf(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o CPF.');
    } finally {
      setSaving(false);
    }
  };

  const passwordModal = userRole === 'agronomo' && mustChangePassword;
  const cpfModal = userRole === 'produtor' && shouldAskCpf;
  if (!passwordModal && !cpfModal) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-login-title"
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white ${passwordModal ? 'bg-[#356b46]' : 'bg-[#b57d59]'}`}>
          {passwordModal ? <KeyRound size={27} /> : <Tractor size={27} />}
        </div>

        {passwordModal ? (
          <>
            <h2 id="first-login-title" className="text-center text-xl font-bold text-slate-900">
              Crie sua nova senha
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-600">
              Como este é seu primeiro acesso como agrônomo, troque a senha inicial antes de continuar.
            </p>
            <form onSubmit={(event) => void handlePasswordSubmit(event)} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Nova senha
                <input
                  autoFocus
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Confirmar nova senha
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#356b46] px-4 py-3 font-bold text-white hover:bg-[#2a5538] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Atualizando senha...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void completeCpfSetup()}
              disabled={saving}
              aria-label="Pular cadastro do CPF"
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={19} />
            </button>
            <h2 id="first-login-title" className="text-center text-xl font-bold text-slate-900">
              Identifique seu perfil mais facilmente
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-600">
              Se quiser, cadastre seu CPF para que o agrônomo encontre seu perfil mais rápido e com mais praticidade na lista de produtores.
              O CPF será visível aos agrônomos que usam essa lista. O preenchimento é opcional.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void completeCpfSetup(cpf);
              }}
              className="mt-6 space-y-4"
            >
              <label className="block text-sm font-semibold text-slate-700">
                CPF (opcional)
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  value={formatarCpf(cpf)}
                  onChange={(event) => setCpf(normalizarCpf(event.target.value).slice(0, 11))}
                  placeholder="000.000.000-00"
                  aria-describedby="cpf-privacy-note"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#b57d59] focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <p id="cpf-privacy-note" className="text-xs text-slate-500">
                Informe os 11 números do CPF. Você também pode pular esta etapa.
              </p>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void completeCpfSetup()}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {saving && !cpf ? 'Salvando...' : 'Pular'}
                </button>
                <button
                  type="submit"
                  disabled={saving || !cpf}
                  className="flex-1 rounded-xl bg-[#b57d59] px-4 py-3 font-bold text-white hover:bg-[#99694b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar CPF'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
