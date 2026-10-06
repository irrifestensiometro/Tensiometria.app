import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Download, LogOut, User as UserIcon, UserRound, X } from 'lucide-react';
import { usePwaInstall } from '../context/PwaInstallContext';

type ProfileRole = 'agronomo' | 'produtor';

export default function ProfileMenu({ roleLabel, role }: { roleLabel: string; role: ProfileRole }) {
  const { currentUser, logout } = useAppContext();
  const { isInstalled, install } = usePwaInstall();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
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

  const handleInstall = async () => {
    setOpen(false);
    setInstallError(null);
    try {
      const outcome = await install();
      if (outcome === 'unavailable') setInstallHelpOpen(true);
    } catch (error) {
      console.error('Não foi possível iniciar a instalação do IRRIFES.', error);
      setInstallError('Não foi possível abrir a instalação automática. Você ainda pode seguir as instruções abaixo.');
      setInstallHelpOpen(true);
    }
  };

  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|LinkedInApp|; wv\)/i.test(userAgent);
  const isSamsungBrowser = /SamsungBrowser\//i.test(userAgent);
  const isEdge = /EdgA?\/|EdgiOS\//i.test(userAgent);
  const isOpera = /OPR\/|Opera/i.test(userAgent);
  const isFirefox = /Firefox\/|FxiOS\//i.test(userAgent);
  const isChrome = /Chrome\/|CriOS\//i.test(userAgent) && !isEdge && !isOpera && !isSamsungBrowser;
  const isSafari = /Safari\//i.test(userAgent) && !isChrome && !isFirefox && !isEdge && !isOpera && !isSamsungBrowser;

  const installationInstructions = isInAppBrowser
    ? isAppleMobile
      ? 'Este navegador está aberto dentro de outro aplicativo. Abra o endereço no Safari e use Compartilhar > Adicionar à Tela de Início.'
      : 'Este navegador está aberto dentro de outro aplicativo. Abra o endereço no Chrome ou Samsung Internet e use o menu para instalar o app.'
    : isAppleMobile
      ? isSafari
        ? 'No Safari, toque em Compartilhar e selecione “Adicionar à Tela de Início”. Confirme em “Adicionar”.'
        : isChrome
          ? 'No Chrome para iPhone ou iPad, abra o menu de compartilhamento e escolha “Adicionar à Tela de Início”. Se a opção não aparecer, abra o endereço no Safari.'
          : isEdge
            ? 'No Edge para iPhone ou iPad, abra o menu de compartilhamento e escolha “Adicionar à Tela de Início”. Se a opção não aparecer, abra o endereço no Safari.'
            : 'No iPhone ou iPad, abra o endereço no Safari, toque em Compartilhar e selecione “Adicionar à Tela de Início”.'
      : isAndroid
        ? isSamsungBrowser
          ? 'No Samsung Internet, abra o menu (☰ ou ⋮) e selecione “Adicionar página a” > “Tela inicial” ou “Instalar aplicativo”.'
          : isFirefox
            ? 'No Firefox para Android, abra o menu (⋮) e toque em “Instalar” ou “Adicionar à tela inicial”.'
            : isChrome || isEdge || isOpera
              ? `No ${isChrome ? 'Chrome' : isEdge ? 'Edge' : 'Opera'}, abra o menu (⋮) e toque em “Instalar app” ou “Adicionar à tela inicial”.`
              : 'Abra o endereço no Chrome ou Samsung Internet, toque no menu (⋮) e selecione “Instalar app” ou “Adicionar à tela inicial”.'
        : isSafari
          ? 'No Safari do macOS, escolha Arquivo > Adicionar ao Dock.'
          : isChrome || isEdge || isOpera
            ? `No ${isChrome ? 'Chrome' : isEdge ? 'Edge' : 'Opera'}, use o ícone de instalação na barra de endereço ou escolha “Instalar IRRIFES” no menu.`
            : isFirefox
              ? 'O Firefox para computador não oferece instalação de PWA. Abra o IRRIFES no Chrome ou Edge e escolha “Instalar IRRIFES”.'
              : 'Este navegador pode não oferecer instalação de PWA. Abra o IRRIFES no Chrome ou Edge e escolha “Instalar IRRIFES”.';

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
            onClick={() => void handleInstall()}
            disabled={isInstalled}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
              isInstalled ? 'cursor-default text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download size={16} />
            <span>{isInstalled ? 'Aplicativo instalado' : 'Instalar aplicativo'}</span>
          </button>
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

      {installHelpOpen && createPortal(
        <div
          className="fixed inset-0 z-[1200] flex items-end justify-center overflow-y-auto bg-slate-950/40 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          onClick={() => setInstallHelpOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-help-title"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">IRRIFES no seu dispositivo</p>
                <h2 id="install-help-title" className="mt-1 text-xl font-bold text-slate-900">Instalar aplicativo</h2>
              </div>
              <button
                type="button"
                onClick={() => setInstallHelpOpen(false)}
                aria-label="Fechar instruções de instalação"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {installError && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{installError}</p>}
            <p role={installError ? undefined : 'status'} className="mt-4 text-sm leading-6 text-slate-600">
              O navegador não disponibilizou a instalação automática. Ela depende do suporte do navegador, de uma conexão
              segura e dos critérios de instalação do sistema. O IRRIFES não pode forçar a instalação nem abrir controles
              que o navegador não disponibilizou.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Como instalar neste dispositivo</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {installationInstructions}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Se essa opção não aparecer, abra o endereço publicado em HTTPS no navegador indicado e tente novamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInstallHelpOpen(false)}
              className="mt-5 w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
            >
              Entendi
            </button>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
