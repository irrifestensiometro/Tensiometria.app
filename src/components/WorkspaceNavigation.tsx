import { Activity, Home, Map, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type WorkspaceRole = 'agronomo' | 'produtor';

const navigationByRole = {
  agronomo: [
    { label: 'Início', to: '/agronomo/dashboard', icon: Home },
    { label: 'Áreas', to: '/agronomo/dashboard#areas', icon: Map },
    { label: 'Nova área', to: '/agronomo/areas/nova', icon: Plus },
  ],
  produtor: [
    { label: 'Início', to: '/produtor/dashboard', icon: Home },
    { label: 'Áreas', to: '/produtor/dashboard#areas', icon: Map },
    { label: 'Nova leitura', to: '/produtor/leituras/nova', icon: Activity },
  ],
} satisfies Record<WorkspaceRole, { label: string; to: string; icon: typeof Home }[]>;

export default function WorkspaceNavigation({ role }: { role: WorkspaceRole }) {
  const location = useLocation();
  const items = navigationByRole[role];

  const isActive = (to: string) => {
    const [pathname, hash] = to.split('#');
    return location.pathname === pathname && (hash ? location.hash === `#${hash}` : !location.hash);
  };

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-3 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      {items.map(({ label, to, icon: Icon }) => (
        <Link
          key={label}
          to={to}
          aria-current={isActive(to) ? 'page' : undefined}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
            isActive(to) ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon size={20} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
