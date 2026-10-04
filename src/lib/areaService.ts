import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { Area } from "../types";

export const criarArea = async (area: Area) => {
  await setDoc(doc(db, "areas", area.id), {
    ...area,
    criado_em: serverTimestamp(),
  });
};

export const atualizarArea = async (area: Area) => {
  const { id, ...dados } = area;
  await updateDoc(doc(db, "areas", id), dados);
};

export const listarAreasDoUsuario = async (
  userId: string,
  role: "agronomo" | "produtor",
) => {
  const campo = role === "agronomo" ? "agronomo_id" : "produtor_id";
  const q = query(collection(db, "areas"), where(campo, "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Area);
};

export const deletarArea = async (areaId: string) => {
  await deleteDoc(doc(db, "areas", areaId));
};