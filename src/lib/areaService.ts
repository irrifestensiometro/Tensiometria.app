import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
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
  const leiturasRef = collection(db, "areas", areaId, "leituras");
  while (true) {
    const leituras = await getDocs(query(leiturasRef, limit(200)));
    if (leituras.empty) break;
    const batch = writeBatch(db);
    leituras.docs.forEach((leitura) => batch.delete(leitura.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "areas", areaId));
};