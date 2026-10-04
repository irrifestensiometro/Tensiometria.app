import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Activity, Map, Users, Plus, CheckCircle2, UserPlus, X, Clock3, ArrowRight, Trash2, ShieldCheck, LoaderCircle, ShieldOff } from 'lucide-react';
import { getAreaColor } from '../../lib/areaColors';
import { criarContaDeAgronomo } from '../../lib/authService';
import { DraftMapPreview } from '../../components/map/DraftMapPreview';
import {
  listAdminAgronomists,
  listAgronomistDeletionHistory,
  removeAgronomistProfile,
  restoreAgronomistProfile,
  type AgronomistDeletion,
  setAgronomistAdminStatus,
  type AdminAgronomist,
} from '../../lib/adminAgronomistService';

export default function AgronomoDashboard() {
  const navigate = useNavigate();
  const {
    areas,
    areaDrafts,
    isAdmin,
    draftSyncError,
    produtores,
    currentUser,
    removeArea,
    removeAreaDraft,
  } = useAppContext();

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
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [showAgronomists, setShowAgronomists] = useState(false);
  const [managedAgronomists, setManagedAgronomists] = useState<AdminAgronomist[]>([]);
  const [deletionHistory, setDeletionHistory] = useState<AgronomistDeletion[]>([]);
  const [loadingAgronomists, setLoadingAgronomists] = useState(false);
  const [loadingDeletionHistory, setLoadingDeletionHistory] = useState(false);
  const [showDeletionHistory, setShowDeletionHistory] = useState(false);
  const [adminActionUid, setAdminActionUid] = useState<string | null>(null);
  const [agronomistError, setAgronomistError] = useState('');

  const handleDeleteDraft = async (draftId: string, name: string) => {
    if (!window.confirm(`Excluir o rascunho "${name || 'Área sem nome'}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingItem(`draft:${draftId}`);
    setDeleteError('');
    try {
      await removeAreaDraft(draftId);
    } catch (error) {
      setDeleteError(`Não foi possível excluir o rascunho: ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleDeleteArea = async (areaId: string, name: string) => {
    if (!window.confirm(`Excluir a área "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingItem(`area:${areaId}`);
    setDeleteError('');
    try {
      await removeArea(areaId);
    } catch (error) {
      setDeleteError(`Não foi possível excluir a área "${name}": ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
    } finally {
      setDeletingItem(null);
    }
  };

  const openAgronomistRoster = async () => {
    setShowAgronomists(true);
    setAgronomistError('');
    setLoadingAgronomists(true);
    try {
      setManagedAgronomists(await listAdminAgronomists());
    } catch (error) {
      setAgronomistError(`Não foi possível carregar os agrônomos: ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
    } finally {
      setLoadingAgronomists(false);
    }
  };

  const handleToggleAgronomistAdmin = async (agronomist: AdminAgronomist) => {
    setAgronomistError('');
    setAdminActionUid(agronomist.uid);
    try {
      setManagedAgronomists(
        await setAgronomistAdminStatus(agronomist.uid, !agronomist.isAdmin),
      );
    } catch (error) {
      setAgronomistError(`Não foi possível alterar o cargo: ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
    } finally {
      setAdminActionUid(null);
    }
  };

  const handleRemoveAgronomist = async (agronomist: AdminAgronomist) => {
    const confirmed = window.confirm(
      `Remover o perfil de ${agronomist.nome || agronomist.email}?\n\n`
      + 'A conta continuará no Firebase Authentication, mas ficará bloqueada para usar o aplicativo. '
      + 'Os dados já existentes não serão apagados. O perfil poderá ser restaurado pelo histórico de exclusões.',
    );
    if (!confirmed) return;

    setAgronomistError('');
    setAdminActionUid(agronomist.uid);
    try {
      setManagedAgronomists(await removeAgronomistProfile(agronomist.uid));
    } catch (error) {
      setAgronomistError(`Não foi possível remover o perfil: ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
    } finally {
      setAdminActionUid(null);
    }
  };

  const openDeletionHistory = async () => {
    setShowDeletionHistory(true);
    setLoadingDeletionHistory(true);
    setAgronomistError('');
    try {
      setDeletionHistory(await listAgronomistDeletionHistory());
    } catch (error) {
      setAgronomistError(`Não foi possível carregar o histórico: ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
    } finally {
      setLoadingDeletionHistory(false);
    }
  };

  const handleRestoreAgronomist = async (deletion: AgronomistDeletion) => {
    if (!window.confirm(
      `Restaurar o perfil de ${deletion.targetName || deletion.targetEmail}?\n\n`
      + 'O mesmo UID e os dados anteriores serão restaurados, e o agrônomo poderá voltar a acessar o aplicativo.',
    )) return;

    setAgronomistError('');
    setAdminActionUid(deletion.id);
    try {
      setDeletionHistory(await restoreAgronomistProfile(deletion));
      setManagedAgronomists(await listAdminAgronomists());
    } catch (error) {
      setAgronomistError(`Não foi possível restaurar o perfil: ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
    } finally {
      setAdminActionUid(null);
    }
  };

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
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
          <button
            onClick={() => { setCreateError(''); setShowCreateAgronomist(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <UserPlus size={18} />
            <span>Novo agrônomo</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => void openAgronomistRoster()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#356b46] px-5 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[#2a5538]"
            >
              <Users size={18} />
              <span>Visualizar agrônomos</span>
            </button>
          )}
        </div>
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

        {draftSyncError && (
          <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {draftSyncError}
          </div>
        )}
        {deleteError && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {deleteError}
          </div>
        )}

        {areaDrafts.length > 0 && (
          <section aria-labelledby="area-drafts-heading" className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 size={19} className="text-amber-700" />
              <h3 id="area-drafts-heading" className="text-lg font-bold text-slate-800">Cadastros em andamento</h3>
            </div>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {areaDrafts.map((draft) => {
                const producerName = produtores.find((producer) => producer.id === draft.formData.produtor_id)?.nome;
                const continuePath = draft.area_id
                  ? `/agronomo/areas/${draft.area_id}/editar?rascunho=${encodeURIComponent(draft.id)}`
                  : `/agronomo/areas/nova?rascunho=${encodeURIComponent(draft.id)}`;
                return (
                  <li key={draft.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Rascunho · Passo {draft.step} de 6</p>
                      <button
                        type="button"
                        onClick={() => void handleDeleteDraft(draft.id, draft.formData.nome.trim())}
                        disabled={deletingItem === `draft:${draft.id}`}
                        aria-label={`Excluir rascunho ${draft.formData.nome || 'sem nome'}`}
                        title="Excluir rascunho"
                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div className="mt-3">
                      <DraftMapPreview points={draft.polygonPoints} />
                    </div>
                    <h4 className="mt-2 truncate text-lg font-bold text-slate-900">
                      {draft.formData.nome.trim() || 'Área sem nome'}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {producerName || 'Produtor ainda não selecionado'}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(continuePath)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 font-bold text-white transition-colors hover:bg-amber-800"
                    >
                      Continuar cadastro
                      <ArrowRight size={17} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 sm:gap-6">
          {areas.length === 0 && areaDrafts.length === 0 ? (
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
                      <div className="flex shrink-0 items-start gap-2">
                        <div className={"flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border " + (area.tensiometros.length > 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-200')}>
                          <CheckCircle2 size={12} />
                          <span>{area.tensiometros.length > 0 ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteArea(area.id, area.nome)}
                          disabled={deletingItem === `area:${area.id}`}
                          aria-label={`Excluir área ${area.nome}`}
                          title="Excluir área"
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                        >
                          <Trash2 size={17} />
                        </button>
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

      {isAdmin && showAgronomists && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="agronomists-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="agronomists-title" className="text-lg font-bold text-slate-900">Agrônomos do sistema</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {showDeletionHistory
                    ? 'Histórico de exclusões e restauração de perfis.'
                    : 'Gerencie os cargos de administrador e os perfis de agrônomo.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAgronomists(false)}
                aria-label="Fechar lista de agrônomos"
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>
            <div className="max-h-[calc(90vh-76px)] overflow-y-auto p-5 sm:p-6">
              <button
                type="button"
                onClick={() => {
                  if (showDeletionHistory) {
                    setShowDeletionHistory(false);
                    setAgronomistError('');
                  } else {
                    void openDeletionHistory();
                  }
                }}
                className="mb-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showDeletionHistory ? 'Voltar aos agrônomos' : 'Ver histórico de exclusões'}
              </button>
              {agronomistError && (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {agronomistError}
                </div>
              )}
              {showDeletionHistory && loadingDeletionHistory ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm font-medium text-slate-500">
                  <LoaderCircle size={19} className="animate-spin" />
                  Carregando histórico...
                </div>
              ) : showDeletionHistory && !agronomistError && deletionHistory.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhuma exclusão de perfil foi registrada.</p>
              ) : showDeletionHistory && !agronomistError ? (
                <ul className="divide-y divide-slate-100">
                  {deletionHistory.map((deletion) => {
                    const busy = adminActionUid === deletion.id;
                    return (
                      <li key={deletion.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">
                            {deletion.targetName || 'Sem nome'} <span className="font-normal text-slate-500">({deletion.targetEmail})</span>
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Excluído por {deletion.actorName || deletion.actorUid}
                            {deletion.actorEmail ? ` (${deletion.actorEmail})` : ''}
                            {deletion.deletedAt
                              ? ` em ${deletion.deletedAt.toLocaleString('pt-BR')}`
                              : ''}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">UID: {deletion.targetUid}</p>
                          {deletion.restoredAt && (
                            <p className="mt-1 text-xs font-semibold text-emerald-700">
                              Restaurado em {deletion.restoredAt.toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                        {!deletion.restoredAt && (
                          <button
                            type="button"
                            onClick={() => void handleRestoreAgronomist(deletion)}
                            disabled={busy}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {busy
                              ? <LoaderCircle size={14} className="animate-spin" />
                              : <ShieldCheck size={14} />}
                            Restaurar perfil
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : loadingAgronomists ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm font-medium text-slate-500">
                  <LoaderCircle size={19} className="animate-spin" />
                  Carregando agrônomos...
                </div>
              ) : !agronomistError && managedAgronomists.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhum perfil de agrônomo foi encontrado.</p>
              ) : !agronomistError && (
                <ul className="divide-y divide-slate-100">
                  {managedAgronomists.map((agronomist) => {
                    const busy = adminActionUid === agronomist.uid;
                    const isCurrentUser = currentUser?.id === agronomist.uid;
                    return (
                      <li key={agronomist.uid} className="flex flex-col gap-3 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-slate-800">{agronomist.nome || 'Sem nome'}</p>
                              {agronomist.isAdmin && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                                  <ShieldCheck size={13} />
                                  Admin
                                </span>
                              )}
                              {isCurrentUser && <span className="text-xs text-slate-400">Você</span>}
                            </div>
                            <p className="mt-1 truncate text-sm text-slate-500">{agronomist.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!isCurrentUser && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleToggleAgronomistAdmin(agronomist)}
                                  disabled={busy}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                                >
                                  {agronomist.isAdmin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                                  {agronomist.isAdmin ? 'Remover admin' : 'Tornar admin'}
                                </button>
                                {!agronomist.isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => void handleRemoveAgronomist(agronomist)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <Trash2 size={14} />
                                    Remover perfil
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {busy && (
                          <p className="flex items-center gap-2 text-xs text-slate-500">
                            <LoaderCircle size={14} className="animate-spin" />
                            Aplicando alteração...
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

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
