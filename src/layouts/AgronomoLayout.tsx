import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Droplet } from 'lucide-react';
import ProfileMenu from '../components/ProfileMenu';
import AILoadingState from '../components/ui/AILoadingState';

export default function AgronomoLayout() {
  const { userRole, currentUser, loading } = useAppContext();

  if (loading) {
    return <AILoadingState />;
  }

  if (userRole !== 'agronomo' || !currentUser) {
    return <Navigate to="/login/agronomo" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/agronomo/dashboard" className="flex items-center space-x-3">
          <div className="bg-[#356b46] p-2 rounded-lg">
            <Droplet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-800">IRRIFES</h1>
            <p className="text-[10px] tracking-widest uppercase text-slate-500 font-medium">Tensiometria</p>
          </div>
        </Link>
        
        <div className="flex items-center space-x-4">
          <ProfileMenu roleLabel="Agrônomo" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
