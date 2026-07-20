import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { registerWithEmail, updateProfile } from '../../lib/firebase';
import { salvarUsuario } from '../../lib/usuarioService';
import { Map, Users, AlertTriangle, UserPlus, X, Plus, Sprout, CheckCircle2 } from 'lucide-react';
import { getAreaColor } from '../../lib/areaColors';

export default function AgronomoDashboard() {
  const navigate = useNavigate();
  const { areas, produtores, agronomos, addAgronomo } = useAppContext();

  const totalAreas = areas.length;
  const totalProdutores = produtores.length;
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [novoAgronomo, setNovoAgronomo] = useState({ nome: '', email: '', senha: '' });
  const [addError, setAddError] = useState('');

  const handleAddAgronomo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!novoAgronomo.nome || !novoAgronomo.email) return;

    const senha = novoAgronomo.senha || '123456';
    try {
      const credencial = await registerWithEmail(novoAgronomo.email, senha);
      await updateProfile(credencial.user, { displayName: novoAgronomo.nome });
      await salvarUsuario(credencial.user.uid, {
        nome: novoAgronomo.nome,
        email: novoAgronomo.email,
        tipo: 'agronomo',
      });
      addAgronomo({
        id: credencial.user.uid,
        nome: novoAgronomo.nome,
        email: novoAgronomo.email,
        senha,
      });
      setNovoAgronomo({ nome: '', email: '', senha: '' });
      setIsAddModalOpen(false);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setAddError('Este e-mail já está cadastrado.');
      } else {
        setAddError('Erro ao criar agrônomo. Tente novamente.');
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center">
            Olá, Dr.! <span className="ml-2 text-2xl">👋</span>
          </h1>
          <p className="text-slate-500 mt-1">Bem-vindo ao seu painel de monitoramento agrícola</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition-colors border border-slate-200 shadow-sm"
        >
          <UserPlus size={18} />
          <span>Novo Agrônomo</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#2D7D46] p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-white/20 p-2.5 rounded-xl">
            <Map size={20} className="text-white" />
          </div>
          <p className="text-emerald-50 text-sm font-medium mb-2">Total de Áreas</p>
          <h2 className="text-4xl font-bold mb-4">{totalAreas}</h2>
          <p className="text-emerald-100 text-xs">Áreas cadastradas</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="absolute top-4 right-4 bg-slate-100 p-2.5 rounded-xl">
            <Users size={20} className="text-slate-500" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-2">Produtores Vinculados</p>
          <h2 className="text-4xl font-bold text-slate-800 mb-4">{totalProdutores}</h2>
          <p className="text-slate-400 text-xs">Parceiros ativos</p>
        </div>
        
        <div className="bg-[#e9f5ec] p-6 rounded-2xl border border-[#d1e8d7] shadow-sm relative">
          <div className="absolute top-4 right-4 bg-[#c8e6d1] p-2.5 rounded-xl">
            <Sprout size={20} className="text-[#356b46]" />
          </div>
          <p className="text-slate-600 text-sm font-medium mb-2">Cultura Principal</p>
          <h2 className="text-4xl font-bold text-slate-800 mb-4">Milho</h2>
          <p className="text-slate-500 text-xs">100% das áreas</p>
        </div>

        <div className="bg-[#fff8eb] p-6 rounded-2xl border border-[#ffe9c2] shadow-sm relative">
          <div className="absolute top-4 right-4 bg-[#ffdfa8] p-2.5 rounded-xl">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <p className="text-slate-600 text-sm font-medium mb-2">Áreas em Alerta</p>
          <h2 className="text-4xl font-bold text-slate-800 mb-4">0</h2>
          <p className="text-slate-500 text-xs">Requerem atenção</p>
        </div>
      </div>

      {/* Suas Áreas */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Suas Áreas</h2>
            <p className="text-sm text-slate-500 mt-1">Gerencie e monitore todas as áreas cadastradas</p>
          </div>
          <button 
            onClick={() => navigate('/agronomo/areas/nova')}
            className="flex items-center justify-center space-x-2 bg-[#356b46] hover:bg-[#2a5538] text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Criar nova área</span>
          </button>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.length === 0 ? (
            <li className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-2xl">
              <Map className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma área cadastrada ainda.</p>
            </li>
          ) : (
            areas.map(area => {
              const prod = produtores.find(p => p.id === area.produtor_id);
              const ac = getAreaColor(area.id);
              const glowShadow = `inset 0 0 20px ${ac.fill}44, 0 0 25px ${ac.fill}33, 0 0 0 2px ${ac.stroke}22`;
              return (
                <li key={area.id} className="list-none">
                  <div
                    className="relative h-full rounded-2xl border bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md flex flex-col group"
                    style={{ borderColor: ac.stroke }}
                  >
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ boxShadow: glowShadow }}
                    />
                    <div className="flex items-start justify-between mb-3 relative">
                      <div className="flex-1 min-w-0 mr-3">
                        <h3 className="text-lg font-bold text-slate-800 truncate">{area.nome}</h3>
                        <p className="text-sm text-slate-500 truncate mt-0.5">{prod?.nome || 'Produtor não vinculado'}</p>
                      </div>
                      <div className={"flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 " + (area.tensiometros.length > 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-200')}>
                        <CheckCircle2 size={12} />
                        <span>{area.tensiometros.length > 0 ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400">θcc</p>
                        <p className="font-bold text-slate-700 text-sm">{(area.solo.umidade_cc * 100).toFixed(0)}%</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Ea</p>
                        <p className="font-bold text-slate-700 text-sm">{(area.irrigacao.eficiencia_ea * 100).toFixed(0)}%</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Ip</p>
                        <p className="font-bold text-slate-700 text-sm">{area.irrigacao.vazao_ip}mm/h</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
                      <span>Z: <span className="font-bold text-slate-700">{area.planta.prof_raiz_mm}mm</span></span>
                      <span>Tensiômetros: <span className="font-bold text-slate-700">{area.tensiometros.length}</span></span>
                    </div>
                    <button
                      onClick={() => navigate('/agronomo/areas/' + area.id)}
                      className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                      Ver Monitoramento
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Modal Add Agronomo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Novo Agrônomo</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddAgronomo} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome Completo</label>
                <input 
                  type="text" required
                  value={novoAgronomo.nome} onChange={e => setNovoAgronomo({...novoAgronomo, nome: e.target.value})}
                  className="w-full p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46] outline-none"
                  placeholder="Nome do agrônomo"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail</label>
                <input 
                  type="email" required
                  value={novoAgronomo.email} onChange={e => setNovoAgronomo({...novoAgronomo, email: e.target.value})}
                  className="w-full p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46] outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha</label>
                <input 
                  type="password" required
                  value={novoAgronomo.senha} onChange={e => setNovoAgronomo({...novoAgronomo, senha: e.target.value})}
                  className="w-full p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46] outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full bg-[#356b46] hover:bg-[#2a5538] text-white font-bold py-4 rounded-xl mt-4 transition-colors shadow-sm">
                Salvar Agrônomo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
