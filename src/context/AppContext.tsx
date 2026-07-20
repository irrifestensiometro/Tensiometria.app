import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Agronomo, Produtor, Area, Leitura } from '../types';
import { auth, onAuthChange, loginWithEmail, logoutUser } from '../lib/firebase';
import { buscarUsuario, buscarUsuariosPorTipo } from '../lib/usuarioService';
import { salvarArea, listarAreas, deletarArea } from '../lib/areaService';

interface AppState {
  agronomos: Agronomo[];
  produtores: Produtor[];
  areas: Area[];
  leituras: Leitura[];
  currentUser: Agronomo | Produtor | null;
  userRole: 'agronomo' | 'produtor' | null;
  loading: boolean;
  login: (email: string, password: string, role: 'agronomo' | 'produtor') => Promise<boolean>;
  logout: () => Promise<void>;
  setRole: (role: 'agronomo' | 'produtor') => void;
  addArea: (area: Area) => void;
  updateArea: (area: Area) => void;
  removeArea: (areaId: string) => void;
  addLeitura: (leitura: Leitura) => void;
  addAgronomo: (agronomo: Agronomo) => void;
  addProdutor: (produtor: Produtor) => void;
  updateProdutor: (produtor: Produtor) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [agronomos, setAgronomos] = useState<Agronomo[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [currentUser, setCurrentUser] = useState<Agronomo | Produtor | null>(null);
  const [userRole, setUserRole] = useState<'agronomo' | 'produtor' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        const user: Produtor = {
          id: firebaseUser.uid,
          nome: firebaseUser.displayName || firebaseUser.email || '',
          email: firebaseUser.email || '',
        };
        setCurrentUser(user);
        Promise.all([
          buscarUsuario(firebaseUser.uid),
          buscarUsuariosPorTipo('produtor'),
          buscarUsuariosPorTipo('agronomo'),
          listarAreas(),
        ]).then(([userData, produtoresData, agronomosData, areasData]) => {
          if (userData) {
            setUserRole(userData.tipo);
            if (userData.localizacao_sede) {
              setCurrentUser(prev => prev ? { ...prev, localizacao_sede: userData.localizacao_sede! } : prev);
            }
          }
          setProdutores(produtoresData.map(p => ({
            id: p.id,
            nome: p.nome,
            email: p.email,
            localizacao_sede: p.localizacao_sede,
          })));
          setAgronomos(agronomosData.map(a => ({
            id: a.id,
            nome: a.nome,
            email: a.email,
          })));
          setAreas(areasData);
        }).catch(() => {}).finally(() => setLoading(false));
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, role: 'agronomo' | 'produtor') => {
    try {
      await loginWithEmail(email, password);
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        setCurrentUser({
          id: firebaseUser.uid,
          nome: firebaseUser.displayName || firebaseUser.email || '',
          email: firebaseUser.email || '',
        });
      }
      setUserRole(role);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await logoutUser();
  };

  const setRole = (role: 'agronomo' | 'produtor') => {
    setUserRole(role);
  };

  const addArea = (area: Area) => {
    setAreas([...areas, area]);
    salvarArea(area).catch(() => {});
  };

  const updateArea = (areaAtualizada: Area) => {
    setAreas(areas.map(a => a.id === areaAtualizada.id ? areaAtualizada : a));
    salvarArea(areaAtualizada).catch(() => {});
  };

  const removeArea = (areaId: string) => {
    setAreas(areas.filter(a => a.id !== areaId));
    deletarArea(areaId).catch(() => {});
  };

  const addLeitura = (leitura: Leitura) => {
    setLeituras([...leituras, leitura]);
  };

  const addAgronomo = (agronomo: Agronomo) => {
    setAgronomos([...agronomos, agronomo]);
  };

  const addProdutor = (produtor: Produtor) => {
    setProdutores([...produtores, produtor]);
  };

  const updateProdutor = (produtorAtualizado: Produtor) => {
    setProdutores(produtores.map(p => p.id === produtorAtualizado.id ? produtorAtualizado : p));
    if (currentUser?.id === produtorAtualizado.id) {
      setCurrentUser(produtorAtualizado);
    }
  };

  return (
    <AppContext.Provider value={{ agronomos, produtores, areas, leituras, currentUser, userRole, loading, login, logout, setRole, addArea, updateArea, removeArea, addLeitura, addAgronomo, addProdutor, updateProdutor }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
