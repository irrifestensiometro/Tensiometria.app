import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { Area, Leitura, LeituraValor } from '../types';
import { db } from './firebase';

const isLeituraValor = (value: unknown): value is LeituraValor => (
  typeof value === 'object'
  && value !== null
  && 'tensiometro_id' in value
  && typeof value.tensiometro_id === 'string'
  && 'leitura_kpa' in value
  && typeof value.leitura_kpa === 'number'
  && Number.isFinite(value.leitura_kpa)
);

const parseLeitura = (
  id: string,
  areaId: string,
  value: Record<string, unknown>,
): Leitura => {
  if (
    value.id !== id
    || value.area_id !== areaId
    || typeof value.data !== 'string'
    || !Number.isFinite(Date.parse(value.data))
    || typeof value.registrado_por_uid !== 'string'
    || !Array.isArray(value.valores)
    || value.valores.length === 0
    || !value.valores.every(isLeituraValor)
  ) {
    throw new Error(`A leitura ${id} contém dados inválidos e não pode ser exibida.`);
  }

  return {
    id,
    area_id: value.area_id,
    data: value.data,
    valores: value.valores,
    registrado_por_uid: value.registrado_por_uid,
  };
};

export const listarLeiturasDasAreas = async (areas: Area[]): Promise<Leitura[]> => {
  const leiturasPorArea = await Promise.all(areas.map(async (area) => {
    const leiturasRef = collection(db, 'areas', area.id, 'leituras');
    const snapshot = await getDocs(query(leiturasRef, orderBy('criado_em', 'desc')));
    return snapshot.docs.map((leituraDoc) => parseLeitura(
      leituraDoc.id,
      area.id,
      leituraDoc.data(),
    ));
  }));

  return leiturasPorArea
    .flat()
    .sort((left, right) => new Date(right.data).getTime() - new Date(left.data).getTime());
};

export const registrarLeitura = async (leitura: Leitura) => {
  await setDoc(doc(db, 'areas', leitura.area_id, 'leituras', leitura.id), {
    ...leitura,
    criado_em: serverTimestamp(),
  });
};
