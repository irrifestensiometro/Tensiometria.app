import { Droplet } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkspaceFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-slate-500 sm:px-6 lg:px-8 lg:pb-5">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <Link to="/" className="flex items-center gap-2" aria-label="IRRIFES - Início">
          <span className="rounded-lg bg-[#356b46] p-1.5">
            <Droplet size={16} className="text-white" aria-hidden="true" />
          </span>
          <span className="font-bold text-slate-700">IRRIFES</span>
        </Link>
        <p className="text-center text-xs">
          &copy; {new Date().getFullYear()} IRRIFES Tensiometria. Todos os direitos reservados.
        </p>
        <Link to="/contato" className="text-xs font-semibold transition-colors hover:text-emerald-800">
          Contato
        </Link>
      </div>
    </footer>
  );
}
