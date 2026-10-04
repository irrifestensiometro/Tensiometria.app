import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Droplet } from 'lucide-react';
import ProfileMenu from '../components/ProfileMenu';
import AILoadingState from '../components/ui/AILoadingState';
import WorkspaceNavigation from '../components/WorkspaceNavigation';

export default function ProdutorLayout() {
  const { userRole, currentUser, loading } = useAppContext();

  if (loading) {
    return <AILoadingState />;
  }

  if (userRole !== 'produtor' || !currentUser) {
    return <Navigate to="/login/produtor" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col font-sans">
      <header className="bg-white/95 border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
        <Link to="/produtor/dashboard" className="flex items-center space-x-3 shrink-0">
          <div className="bg-[#356b46] p-2.5 rounded-xl shadow-sm">
            <Droplet size={19} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-800">IRRIFES</h1>
            <p className="text-[10px] tracking-widest uppercase text-slate-500 font-medium">Tensiometria</p>
          </div>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <ProfileMenu roleLabel="Produtor Rural" />
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-5 pb-24 sm:px-6 sm:pt-8 sm:pb-24 lg:px-8 lg:pb-10 flex flex-col">
        <Outlet />
      </main>
      <WorkspaceNavigation role="produtor" />
    </div>
  );
}
