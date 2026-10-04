import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Area, AreaDraft, Leitura, Produtor, ProdutorOpcao } from '../types';
import { auth, onAuthChange, loginWithEmail, logoutUser } from '../lib/firebase';
import { validarAcessoPorPapel } from '../lib/authService';
import { trocarSenhaInicialAgronomo } from '../lib/authService';
import {
  atualizarPerfilProdutor,
  buscarUsuario,
  concluirCadastroCpfProdutor,
  listarProdutoresParaVinculo,
} from '../lib/usuarioService';
import { normalizarCpf, validarCpf } from '../lib/cpf';
import { criarArea, atualizarArea as persistirArea, listarAreasDoUsuario, deletarArea } from '../lib/areaService';
import {
  listarRascunhosLocais,
  listarRascunhosRemotos,
  removerRascunhoLocal,
  removerRascunhoRemoto,
  salvarRascunhoLocal,
  salvarRascunhoRemoto,
} from '../lib/areaDraftService';

interface AppState {
  produtores: ProdutorOpcao[];
  isAdmin: boolean;
  mustChangePassword: boolean;
  shouldAskCpf: boolean;
  areas: Area[];
  areaDrafts: AreaDraft[];
  leituras: Leitura[];
  currentUser: Produtor | null;
  userRole: 'agronomo' | 'produtor' | null;
  loading: boolean;
  loadError: string | null;
  draftSyncError: string | null;
  login: (email: string, password: string, role: 'agronomo' | 'produtor') => Promise<boolean>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  trocarSenhaInicial: (novaSenha: string) => Promise<void>;
  concluirCadastroCpf: (cpf?: string) => Promise<void>;
  updateAccountProfile: (nome: string, cpf?: string) => Promise<void>;
  addArea: (area: Area) => Promise<void>;
  updateArea: (area: Area) => Promise<void>;
  removeArea: (areaId: string) => Promise<void>;
  saveAreaDraftLocally: (draft: AreaDraft) => void;
  saveAreaDraft: (draft: AreaDraft) => Promise<void>;
  removeAreaDraft: (draftId: string) => Promise<void>;
  addLeitura: (leitura: Leitura) => void;
  updateProdutor: (produtor: Produtor) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado ao carregar os dados.';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [produtores, setProdutores] = useState<ProdutorOpcao[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [shouldAskCpf, setShouldAskCpf] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaDrafts, setAreaDrafts] = useState<AreaDraft[]>([]);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [currentUser, setCurrentUser] = useState<Produtor | null>(null);
  const [userRole, setUserRole] = useState<'agronomo' | 'produtor' | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftSyncError, setDraftSyncError] = useState<string | null>(null);
  const loadVersion = useRef(0);
  const draftSaveQueue = useRef<Promise<void>>(Promise.resolve());

  const loadUserData = async (firebaseUser: User) => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError(null);
    setDraftSyncError(null);
    try {
      const userData = await buscarUsuario(firebaseUser.uid);
      if (version !== loadVersion.current) return;
      if (!userData) {
        throw new Error('Esta conta ainda não tem perfil no sistema. Crie seu perfil de produtor ou solicite ao administrador o cadastro como agrônomo.');
      }
      const role = userData.tipo;
      const hasAdminRole = role === 'agronomo' && userData.cargo === 'admin';
      const passwordChangePending = role === 'agronomo'
        && userData.troca_senha_pendente === true;
      const cpfOnboardingPending = role === 'produtor'
        && userData.cpf_prompted !== true
        && !userData.cpf;
      const [userAreas, producerOptions] = await Promise.all([
        listarAreasDoUsuario(firebaseUser.uid, role),
        role === 'agronomo'
          ? listarProdutoresParaVinculo()
          : Promise.resolve<ProdutorOpcao[]>([]),
      ]);
      if (version !== loadVersion.current) return;
      if (role === 'agronomo') {
        let localDrafts: AreaDraft[] = [];
        let localDraftError = '';
        try {
          localDrafts = listarRascunhosLocais(firebaseUser.uid);
        } catch (error) {
          localDraftError = `Não foi possível ler os rascunhos deste dispositivo: ${getErrorMessage(error)}`;
        }
        try {
          const remoteDrafts = await listarRascunhosRemotos(firebaseUser.uid);
          const draftsById = new Map(localDrafts.map((draft) => [draft.id, draft]));
          remoteDrafts.forEach((draft) => {
            const localDraft = draftsById.get(draft.id);
            if (!localDraft || draft.updated_at >= localDraft.updated_at) {
              draftsById.set(draft.id, draft);
            }
          });
          setAreaDrafts(
            Array.from(draftsById.values()).sort((left, right) => right.updated_at - left.updated_at),
          );
          setDraftSyncError(localDraftError || null);
        } catch (error) {
          setAreaDrafts(localDrafts);
          setDraftSyncError(
            [
              localDraftError,
              `Os rascunhos disponíveis neste dispositivo foram carregados, mas não foi possível sincronizar com a nuvem: ${getErrorMessage(error)}`,
            ].filter(Boolean).join(' '),
          );
        }
      } else {
        setAreaDrafts([]);
        setDraftSyncError(null);
      }
      if (version !== loadVersion.current) return;
      setCurrentUser({
        id: firebaseUser.uid,
        nome: userData.nome,
        email: userData.email,
        ...(userData.cpf ? { cpf: userData.cpf } : {}),
        ...(userData.localizacao_sede
          ? { localizacao_sede: userData.localizacao_sede }
          : {}),
      });
      setUserRole(role);
      setIsAdmin(hasAdminRole);
      setMustChangePassword(passwordChangePending);
      setShouldAskCpf(cpfOnboardingPending);
      setProdutores(
        role === 'produtor'
          ? [{
              id: firebaseUser.uid,
              nome: userData.nome,
              ...(userData.cpf ? { cpf: userData.cpf } : {}),
            }]
          : producerOptions,
      );
      setAreas(userAreas);
    } catch (error) {
      if (version !== loadVersion.current) return;
      setCurrentUser(null);
      setUserRole(null);
      setIsAdmin(false);
      setMustChangePassword(false);
      setShouldAskCpf(false);
      setProdutores([]);
      setAreas([]);
      setAreaDrafts([]);
      setLoadError(`Não foi possível carregar os dados da conta: ${getErrorMessage(error)}`);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        void loadUserData(firebaseUser);
      } else {
        loadVersion.current += 1;
        setCurrentUser(null);
        setUserRole(null);
        setIsAdmin(false);
        setMustChangePassword(false);
        setShouldAskCpf(false);
        setProdutores([]);
        setAreas([]);
        setAreaDrafts([]);
        setLoadError(null);
        setDraftSyncError(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, requestedRole: 'agronomo' | 'produtor') => {
    const credential = await loginWithEmail(email, password);
    await validarAcessoPorPapel(credential.user, requestedRole);
    return true;
  };

  const refreshCurrentUser = async () => {
    if (auth.currentUser) {
      await loadUserData(auth.currentUser);
    }
  };

  const trocarSenhaInicial = async (novaSenha: string) => {
    await trocarSenhaInicialAgronomo(novaSenha);
    setMustChangePassword(false);
  };

  const concluirCadastroCpf = async (cpf?: string) => {
    if (!currentUser || userRole !== 'produtor') {
      throw new Error('Somente um produtor autenticado pode concluir este cadastro.');
    }
    if (cpf && !validarCpf(cpf)) {
      throw new Error('Informe um CPF válido ou escolha pular.');
    }
    const normalizedCpf = cpf ? normalizarCpf(cpf) : undefined;
    await concluirCadastroCpfProdutor(currentUser.id, normalizedCpf);
    setShouldAskCpf(false);
    if (normalizedCpf) {
      const updatedUser = { ...currentUser, cpf: normalizedCpf };
      setCurrentUser(updatedUser);
      setProdutores((current) => current.map((producer) =>
        producer.id === currentUser.id
          ? { ...producer, cpf: normalizedCpf }
          : producer,
      ));
    }
  };

  const updateAccountProfile = async (nome: string, cpf?: string) => {
    if (!currentUser || !userRole) {
      throw new Error('Não há um perfil autenticado para atualizar.');
    }
    const normalizedName = nome.trim();
    if (!normalizedName || normalizedName.length > 120) {
      throw new Error('Informe um nome com até 120 caracteres.');
    }
    if (userRole === 'produtor' && cpf && !validarCpf(cpf)) {
      throw new Error('Informe um CPF válido.');
    }
    const normalizedCpf = userRole === 'produtor' && cpf
      ? normalizarCpf(cpf)
      : undefined;
    await atualizarPerfilProdutor(currentUser.id, {
      nome: normalizedName,
      ...(userRole === 'produtor' ? { cpf: normalizedCpf ?? null } : {}),
    });

    const updatedUser = {
      ...currentUser,
      nome: normalizedName,
      ...(userRole === 'produtor'
        ? normalizedCpf
          ? { cpf: normalizedCpf }
          : { cpf: undefined }
        : {}),
    };
    setCurrentUser(updatedUser);
    setProdutores((current) => current.map((producer) =>
      producer.id === currentUser.id
        ? {
            ...producer,
            nome: normalizedName,
            ...(userRole === 'produtor'
              ? normalizedCpf
                ? { cpf: normalizedCpf }
                : { cpf: undefined }
              : {}),
          }
        : producer,
    ));
  };

  const logout = async () => {
    await logoutUser();
  };

  const addArea = async (area: Area) => {
    await criarArea(area);
    setAreas((current) => [...current, area]);
  };

  const updateArea = async (areaAtualizada: Area) => {
    await persistirArea(areaAtualizada);
    setAreas((current) => current.map((area) =>
      area.id === areaAtualizada.id ? areaAtualizada : area,
    ));
  };

  const removeArea = async (areaId: string) => {
    await deletarArea(areaId);
    setAreas((current) => current.filter((area) => area.id !== areaId));
  };

  const saveAreaDraftLocally = useCallback((draft: AreaDraft) => {
    salvarRascunhoLocal(draft);
    setAreaDrafts((current) => [
      ...current.filter((item) => item.id !== draft.id),
      draft,
    ].sort((left, right) => right.updated_at - left.updated_at));
  }, []);

  const saveAreaDraft = useCallback(async (draft: AreaDraft) => {
    saveAreaDraftLocally(draft);
    try {
      const nextSave = draftSaveQueue.current.then(() => salvarRascunhoRemoto(draft));
      draftSaveQueue.current = nextSave.catch(() => undefined);
      await nextSave;
      setDraftSyncError(null);
    } catch (error) {
      const message = `O rascunho foi salvo neste dispositivo, mas não foi possível sincronizá-lo com a nuvem: ${getErrorMessage(error)}`;
      setDraftSyncError(message);
      throw new Error(message, { cause: error });
    }
  }, [saveAreaDraftLocally]);

  const removeAreaDraft = useCallback(async (draftId: string) => {
    if (!currentUser) throw new Error('Não há um usuário autenticado para remover o rascunho.');
    await draftSaveQueue.current;
    await removerRascunhoRemoto(draftId);
    removerRascunhoLocal(currentUser.id, draftId);
    setAreaDrafts((current) => current.filter((draft) => draft.id !== draftId));
    setDraftSyncError(null);
  }, [currentUser]);

  const addLeitura = (leitura: Leitura) => {
    setLeituras((current) => [...current, leitura]);
  };

  const updateProdutor = (produtorAtualizado: Produtor) => {
    setProdutores((current) => current.map((produtor) =>
      produtor.id === produtorAtualizado.id ? produtorAtualizado : produtor,
    ));
    if (currentUser?.id === produtorAtualizado.id) {
      setCurrentUser(produtorAtualizado);
    }
  };

  return (
    <AppContext.Provider value={{
      produtores,
      isAdmin,
      mustChangePassword,
      shouldAskCpf,
      areas,
      areaDrafts,
      leituras,
      currentUser,
      userRole,
      loading,
      loadError,
      draftSyncError,
      login,
      logout,
      refreshCurrentUser,
      trocarSenhaInicial,
      concluirCadastroCpf,
      updateAccountProfile,
      addArea,
      updateArea,
      removeArea,
      saveAreaDraftLocally,
      saveAreaDraft,
      removeAreaDraft,
      addLeitura,
      updateProdutor,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
