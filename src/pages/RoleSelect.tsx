import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Tractor, Users, ArrowRight } from 'lucide-react';

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#f0faf0] via-white to-[#faf5f0]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="flex items-center space-x-2 mb-12">
          <div className="bg-gradient-to-br from-[#356b46] to-[#2D7D46] p-3 rounded-xl">
            <Droplet size={24} className="text-white" />
          </div>
          <span className="font-extrabold text-xl text-slate-800">IRRIFES</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 text-center mb-2">
          Como deseja acessar?
        </h1>
        <p className="text-slate-500 text-center mb-10 max-w-md">
          Selecione seu perfil para entrar no sistema
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
          <button
            onClick={() => navigate('/login/produtor')}
            className="flex-1 bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-[#b57d59]/30 transition-all group text-center"
          >
            <div className="bg-[#b57d59]/10 p-4 rounded-2xl w-fit mx-auto mb-5 group-hover:bg-[#b57d59]/20 transition-colors">
              <Tractor size={36} className="text-[#b57d59]" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Produtor Rural</h2>
            <p className="text-sm text-slate-500 mb-4">Acesse suas áreas, faça leituras e receba recomendações de irrigação</p>
            <div className="text-[#b57d59] font-semibold text-sm flex items-center justify-center space-x-1 group-hover:space-x-2 transition-all">
              <span>Entrar como Produtor</span>
              <ArrowRight size={16} />
            </div>
          </button>

          <button
            onClick={() => navigate('/login/agronomo')}
            className="flex-1 bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-[#356b46]/30 transition-all group text-center"
          >
            <div className="bg-[#356b46]/10 p-4 rounded-2xl w-fit mx-auto mb-5 group-hover:bg-[#356b46]/20 transition-colors">
              <Users size={36} className="text-[#356b46]" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Agrônomo / Consultor</h2>
            <p className="text-sm text-slate-500 mb-4">Gerencie múltiplos produtores, desenhe áreas e acompanhe dados técnicos</p>
            <div className="text-[#356b46] font-semibold text-sm flex items-center justify-center space-x-1 group-hover:space-x-2 transition-all">
              <span>Entrar como Agrônomo</span>
              <ArrowRight size={16} />
            </div>
          </button>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-12 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Voltar para página inicial
        </button>
      </div>

      <div className="py-6 text-center text-xs text-slate-400">
        &copy; 2024 IRRIFES Tensiometria. Todos os direitos reservados.
      </div>
    </div>
  );
}
