import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Activity, Map, Users, Plus, CheckCircle2, UserPlus, X } from 'lucide-react';
import { getAreaColor } from '../../lib/areaColors';
import { criarContaDeAgronomo } from '../../lib/authService';

export default function AgronomoDashboard() {
  const navigate = useNavigate();
  const { areas, produtores, currentUser } = useAppContext();

  const totalAreas = areas.length;
  const totalProdutores = new Set(areas.map((area) => area.produtor_id)).size;
  const totalTensiometros = areas.reduce((total, area) => total + area.tensiometros.length, 0);
  const totalSetores = areas.reduce((total, area) => (
    total + new Set(area.tensiometros.map((sensor) => sensor.setor?.trim() || 'Tensiômetros')).size
  ), 0);
  const [showCreateAgronomist, setShowCreateAgronomist] = useState(false);
  const [newAgronomist, setNewAgronomist] = useState({ nome: '', email: '', password: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateAgronomist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await criarContaDeAgronomo(
        newAgronomist.nome.trim(),
        newAgronomist.email.trim(),
        newAgronomist.password,
      );
      setNewAgronomist({ nome: '', email: '', password: '' });
      setShowCreateAgronomist(false);
      window.alert('Conta de agrônomo criada. O novo usuário já pode entrar com o e-mail e a senha cadastrados.');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-7 sm:space-y-9 animate-in fade-in duration-500">
      <section className="flex flex-col gap-5 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Painel do agrônomo</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            Olá, {currentUser?.nome || 'Agrônomo'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">Acompanhe suas áreas e o monitoramento agrícola.</p>
        </div>
        <button
          onClick={() => { setCreateError(''); setShowCreateAgronomist(true); }}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
        >
          <UserPlus size={18} />
          <span>Novo agrônomo</span>
        </button>
      </section>

      <section aria-label="Resumo da conta" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-[#2D7D46] p-4 text-white shadow-sm sm:p-6">
          <div className="absolute right-3 top-3 rounded-xl bg-white/20 p-2 sm:right-4 sm:top-4 sm:p-2.5">
            <Map size={20} className="text-white" />
          </div>
          <p className="mb-2 pr-9 text-xs font-medium text-emerald-50 sm:text-sm">Áreas</p>
          <h2 className="mb-2 text-3xl font-bold sm:mb-3 sm:text-4xl">{totalAreas}</h2>
          <p className="text-[11px] text-emerald-100 sm:text-xs">Cadastradas no seu perfil</p>
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="absolute right-3 top-3 rounded-xl bg-slate-100 p-2 sm:right-4 sm:top-4 sm:p-2.5">
            <Users size={20} className="text-slate-500" />
          </div>
          <p className="mb-2 pr-8 text-xs font-medium text-slate-500 sm:text-sm">Produtores</p>
          <h2 className="mb-2 text-3xl font-bold text-slate-800 sm:mb-3 sm:text-4xl">{totalProdutores}</h2>
          <p className="text-[11px] text-slate-400 sm:text-xs">Com áreas vinculadas</p>
        </div>
        
        <div className="relative rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm sm:p-6">
          <div className="absolute right-3 top-3 rounded-xl bg-emerald-100 p-2 sm:right-4 sm:top-4 sm:p-2.5">
            <Activity size={20} className="text-[#356b46]" />
          </div>
          <p className="mb-2 pr-8 text-xs font-medium text-slate-600 sm:text-sm">Tensiômetros</p>
          <h2 className="mb-2 text-3xl font-bold text-slate-800 sm:mb-3 sm:text-4xl">{totalTensiometros}</h2>
          <p className="text-[11px] text-slate-500 sm:text-xs">Distribuídos nas áreas</p>
        </div>

        <div className="relative rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm sm:p-6">
          <div className="absolute right-3 top-3 rounded-xl bg-amber-100 p-2 sm:right-4 sm:top-4 sm:p-2.5">
            <Map size={20} className="text-amber-700" />
          </div>
          <p className="mb-2 pr-8 text-xs font-medium text-slate-600 sm:text-sm">Setores</p>
          <h2 className="mb-2 text-3xl font-bold text-slate-800 sm:mb-3 sm:text-4xl">{totalSetores}</h2>
          <p className="text-[11px] text-slate-500 sm:text-xs">Grupos de monitoramento</p>
        </div>
      </section>

      <section id="areas" className="scroll-mt-28">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Suas áreas</h2>
            <p className="mt-1 text-sm text-slate-500">Gerencie e monitore as áreas vinculadas à sua conta.</p>
          </div>
          <button 
            onClick={() => navigate('/agronomo/areas/nova')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#356b46] px-5 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[#2a5538] sm:w-auto"
          >
            <Plus size={18} />
            <span>Criar nova área</span>
          </button>
        </div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 sm:gap-6">
          {areas.length === 0 ? (
            <li className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center sm:py-14">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <Map size={26} />
              </div>
              <p className="font-semibold text-slate-800">Você ainda não cadastrou uma área</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Crie a primeira área para começar a organizar produtores, setores e tensiômetros.</p>
              <button
                onClick={() => navigate('/agronomo/areas/nova')}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#356b46] px-5 py-3 font-bold text-white transition-colors hover:bg-[#2a5538]"
              >
                <Plus size={18} />
                Criar primeira área
              </button>
            </li>
          ) : (
            areas.map(area => {
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
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {produtores.find((produtor) => produtor.id === area.produtor_id)?.nome || 'Produtor vinculado'}
                        </p>
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
      </section>

      {showCreateAgronomist && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-agronomist-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="create-agronomist-title" className="text-lg font-bold text-slate-900">Cadastrar agrônomo</h2>
                <p className="mt-1 text-sm text-slate-500">Informe os dados para criar o acesso.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAgronomist(false)}
                aria-label="Fechar"
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleCreateAgronomist} className="space-y-4 p-5 sm:p-6">
              {createError && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {createError}
                </div>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Nome completo
                <input
                  required
                  maxLength={120}
                  value={newAgronomist.nome}
                  onChange={(event) => setNewAgronomist({ ...newAgronomist, nome: event.target.value })}
                  autoComplete="name"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                E-mail
                <input
                  required
                  type="email"
                  value={newAgronomist.email}
                  onChange={(event) => setNewAgronomist({ ...newAgronomist, email: event.target.value })}
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Senha inicial
                <input
                  required
                  type="password"
                  minLength={6}
                  value={newAgronomist.password}
                  onChange={(event) => setNewAgronomist({ ...newAgronomist, password: event.target.value })}
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-[#356b46] px-4 py-3 font-bold text-white transition-colors hover:bg-[#2a5538] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? 'Criando conta...' : 'Criar conta de agrônomo'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
