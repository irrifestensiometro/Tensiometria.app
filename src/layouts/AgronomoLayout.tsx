import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Droplet } from 'lucide-react';
import ProfileMenu from '../components/ProfileMenu';
import AILoadingState from '../components/ui/AILoadingState';
import WorkspaceNavigation from '../components/WorkspaceNavigation';

export default function AgronomoLayout() {
  const { userRole, currentUser, loading } = useAppContext();

  if (loading) {
    return <AILoadingState />;
  }

  if (userRole !== 'agronomo' || !currentUser) {
    return <Navigate to="/login/agronomo" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f6f8f6] flex flex-col font-sans">
      <header className="bg-white/95 border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
        <Link to="/agronomo/dashboard" className="flex items-center space-x-3 shrink-0">
          <div className="bg-[#356b46] p-2.5 rounded-xl shadow-sm">
            <Droplet size={19} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-800">IRRIFES</h1>
            <p className="text-[10px] tracking-widest uppercase text-slate-500 font-medium">Tensiometria</p>
          </div>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <ProfileMenu role="agronomo" roleLabel="Agrônomo" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-5 pb-24 sm:px-6 sm:pt-8 sm:pb-24 lg:px-8 lg:pb-10">
        <Outlet />
      </main>
      <WorkspaceNavigation role="agronomo" />
    </div>
  );
}
