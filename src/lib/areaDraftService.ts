import { deleteDoc, doc, getDocs, collection, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import type { AreaDraft } from '../types';
import { desserializarRascunhoArea, serializarRascunhoArea } from './areaDraftCodec';

const localKey = (userId: string) => `irrIfes-area-drafts:${userId}`;

export function listarRascunhosLocais(userId: string): AreaDraft[] {
  const rawDrafts = localStorage.getItem(localKey(userId));
  if (!rawDrafts) return [];

  const parsed: unknown = JSON.parse(rawDrafts);
  if (!Array.isArray(parsed)) {
    throw new Error('Os rascunhos locais de áreas estão em um formato inválido.');
  }
  return parsed as AreaDraft[];
}

export function salvarRascunhoLocal(rascunho: AreaDraft) {
  const rascunhos = listarRascunhosLocais(rascunho.agronomo_id);
  const atualizados = [
    ...rascunhos.filter((item) => item.id !== rascunho.id),
    rascunho,
  ];
  localStorage.setItem(localKey(rascunho.agronomo_id), JSON.stringify(atualizados));
}

export function removerRascunhoLocal(userId: string, draftId: string) {
  const rascunhos = listarRascunhosLocais(userId).filter((item) => item.id !== draftId);
  localStorage.setItem(localKey(userId), JSON.stringify(rascunhos));
}

export async function salvarRascunhoRemoto(rascunho: AreaDraft) {
  await setDoc(doc(db, 'rascunhos_areas', rascunho.id), serializarRascunhoArea(rascunho));
}

export async function listarRascunhosRemotos(userId: string): Promise<AreaDraft[]> {
  const rascunhos = query(
    collection(db, 'rascunhos_areas'),
    where('agronomo_id', '==', userId),
  );
  const snapshot = await getDocs(rascunhos);
  return snapshot.docs.map((item) => desserializarRascunhoArea(item.data()));
}

export async function removerRascunhoRemoto(draftId: string) {
  await deleteDoc(doc(db, 'rascunhos_areas', draftId));
}
