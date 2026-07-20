import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface UsuarioData {
  nome: string;
  email: string;
  tipo: "agronomo" | "produtor";
  localizacao_sede?: { lat: number; lng: number };
}

export const salvarUsuario = async (uid: string, data: UsuarioData) => {
  await setDoc(doc(db, "usuarios", uid), {
    ...data,
    criado_em: serverTimestamp(),
  });
};

export const buscarUsuario = async (uid: string) => {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return null;
  return snap.data() as UsuarioData;
};

export const buscarUsuariosPorTipo = async (tipo: "agronomo" | "produtor") => {
  const q = query(collection(db, "usuarios"), where("tipo", "==", tipo));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (UsuarioData & { id: string })[];
};
