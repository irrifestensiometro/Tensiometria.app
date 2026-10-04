import {
  doc,
  collection,
  deleteField,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";
import type { ProdutorOpcao } from "../types";

export interface UsuarioData {
  nome: string;
  email: string;
  tipo: "agronomo" | "produtor";
  cargo?: "admin";
  cpf?: string;
  cpf_prompted?: boolean;
  troca_senha_pendente?: boolean;
  localizacao_sede?: { lat: number; lng: number };
}

export const criarPerfilUsuario = async (
  uid: string,
  nome: string,
  email: string,
  tipo: UsuarioData["tipo"],
) => {
  await setDoc(doc(db, "usuarios", uid), {
    nome,
    email,
    tipo,
    ...(tipo === "produtor" ? { cpf_prompted: false } : {}),
    criado_em: serverTimestamp(),
  });
};

export const garantirPerfilUsuario = async (
  user: User,
  tipo: UsuarioData["tipo"],
) => {
  let perfil = await buscarUsuario(user.uid);
  if (!perfil) {
    if (tipo !== "produtor") return null;

    const email = user.email;
    if (!email) {
      throw new Error("A conta autenticada não possui um endereço de e-mail.");
    }

    try {
      await criarPerfilUsuario(user.uid, user.displayName || email, email, tipo);
    } catch (error) {
      const existingProfile = await buscarUsuario(user.uid);
      if (!existingProfile || existingProfile.tipo !== tipo || existingProfile.email !== email) {
        throw error;
      }
      perfil = existingProfile;
    }
    perfil ??= await buscarUsuario(user.uid);
  }

  if (!perfil) return null;
  if (perfil.tipo !== tipo) return null;
  return perfil;
};

export const listarProdutoresParaVinculo = async (): Promise<ProdutorOpcao[]> => {
  const producersQuery = query(
    collection(db, "usuarios"),
    where("tipo", "==", "produtor"),
  );
  const snapshot = await getDocs(producersQuery);
  return snapshot.docs
    .map((producerDoc) => {
      const data = producerDoc.data();
      const nome = data.nome;
      if (typeof nome !== "string" || !nome.trim()) return null;

      const location = data.localizacao_sede;
      const cpf = typeof data.cpf === "string" ? data.cpf : undefined;
      const localizacao_sede = location
        && typeof location.lat === "number"
        && Number.isFinite(location.lat)
        && location.lat >= -90
        && location.lat <= 90
        && typeof location.lng === "number"
        && Number.isFinite(location.lng)
        && location.lng >= -180
        && location.lng <= 180
        ? { lat: location.lat, lng: location.lng }
        : undefined;

      return {
        id: producerDoc.id,
        nome,
        ...(cpf ? { cpf } : {}),
        ...(localizacao_sede ? { localizacao_sede } : {}),
      };
    })
    .filter((producer): producer is ProdutorOpcao => producer !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
};

export const criarPerfilAgronomoAdministrativamente = async (
  uid: string,
  nome: string,
  email: string,
) => {
  await setDoc(doc(db, "usuarios", uid), {
    nome,
    email,
    tipo: "agronomo",
    troca_senha_pendente: true,
    criado_em: serverTimestamp(),
  });
};

export const concluirCadastroCpfProdutor = async (uid: string, cpf?: string) => {
  await updateDoc(doc(db, "usuarios", uid), {
    ...(cpf ? { cpf } : {}),
    cpf_prompted: true,
  });
};

export const concluirTrocaSenhaInicial = async (uid: string) => {
  await updateDoc(doc(db, "usuarios", uid), {
    troca_senha_pendente: false,
  });
};

export const atualizarPerfilProdutor = async (
  uid: string,
  data: Pick<UsuarioData, "nome" | "localizacao_sede"> & { cpf?: string | null },
) => {
  const { cpf, ...profileData } = data;
  if (cpf === null) {
    await updateDoc(doc(db, "usuarios", uid), {
      ...profileData,
      cpf: deleteField(),
    });
    return;
  }
  await updateDoc(doc(db, "usuarios", uid), {
    ...profileData,
    ...(cpf ? { cpf } : {}),
  });
};

export const buscarUsuario = async (uid: string) => {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return null;
  return snap.data() as UsuarioData;
};
