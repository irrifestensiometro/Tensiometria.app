import { doc, setDoc, getDocs, deleteDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Area } from "../types";

export const salvarArea = async (area: Area) => {
  await setDoc(doc(db, "areas", area.id), {
    ...area,
    criado_em: serverTimestamp(),
  });
};

export const listarAreas = async () => {
  const snap = await getDocs(collection(db, "areas"));
  return snap.docs.map(doc => doc.data() as Area);
};

export const deletarArea = async (areaId: string) => {
  await deleteDoc(doc(db, "areas", areaId));
};