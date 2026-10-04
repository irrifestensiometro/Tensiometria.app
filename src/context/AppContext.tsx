import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Area, Leitura, Produtor, ProdutorOpcao } from '../types';
import { auth, onAuthChange, loginWithEmail, logoutUser } from '../lib/firebase';
import { validarAcessoPorPapel } from '../lib/authService';
import { buscarUsuario, listarProdutoresParaVinculo } from '../lib/usuarioService';
import { criarArea, atualizarArea as persistirArea, listarAreasDoUsuario, deletarArea } from '../lib/areaService';

interface AppState {
  produtores: ProdutorOpcao[];
  areas: Area[];
  leituras: Leitura[];
  currentUser: Produtor | null;
  userRole: 'agronomo' | 'produtor' | null;
  loading: boolean;
  loadError: string | null;
  login: (email: string, password: string, role: 'agronomo' | 'produtor') => Promise<boolean>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  addArea: (area: Area) => Promise<void>;
  updateArea: (area: Area) => Promise<void>;
  removeArea: (areaId: string) => Promise<void>;
  addLeitura: (leitura: Leitura) => void;
  updateProdutor: (produtor: Produtor) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado ao carregar os dados.';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [produtores, setProdutores] = useState<ProdutorOpcao[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [currentUser, setCurrentUser] = useState<Produtor | null>(null);
  const [userRole, setUserRole] = useState<'agronomo' | 'produtor' | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadVersion = useRef(0);

  const loadUserData = async (firebaseUser: User) => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError(null);
    try {
      const userData = await buscarUsuario(firebaseUser.uid);
      if (version !== loadVersion.current) return;
      if (!userData) {
        throw new Error('Esta conta ainda não tem perfil no sistema. Crie seu perfil de produtor ou solicite ao administrador o cadastro como agrônomo.');
      }
      const role = userData.tipo;

      const [userAreas, producerOptions] = await Promise.all([
        listarAreasDoUsuario(firebaseUser.uid, role),
        role === 'agronomo'
          ? listarProdutoresParaVinculo()
          : Promise.resolve<ProdutorOpcao[]>([]),
      ]);
      if (version !== loadVersion.current) return;
      setCurrentUser({
        id: firebaseUser.uid,
        nome: userData.nome,
        email: userData.email,
        ...(userData.localizacao_sede
          ? { localizacao_sede: userData.localizacao_sede }
          : {}),
      });
      setUserRole(role);
      setProdutores(
        role === 'produtor'
          ? [{
              id: firebaseUser.uid,
              nome: userData.nome,
            }]
          : producerOptions,
      );
      setAreas(userAreas);
    } catch (error) {
      if (version !== loadVersion.current) return;
      setCurrentUser(null);
      setUserRole(null);
      setProdutores([]);
      setAreas([]);
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
        setProdutores([]);
        setAreas([]);
        setLoadError(null);
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
      areas,
      leituras,
      currentUser,
      userRole,
      loading,
      loadError,
      login,
      logout,
      refreshCurrentUser,
      addArea,
      updateArea,
      removeArea,
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
