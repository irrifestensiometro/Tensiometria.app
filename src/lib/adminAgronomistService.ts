import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AdminAgronomist {
  uid: string;
  nome: string;
  email: string;
  isAdmin: boolean;
}

export interface AgronomistDeletion {
  id: string;
  targetUid: string;
  targetName: string;
  targetEmail: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  deletedAt: Date | null;
  restoredAt: Date | null;
  profile: Record<string, unknown>;
}

const deletionCollection = collection(db, 'historico_exclusoes_agronomos');

export async function listAdminAgronomists() {
  const profilesQuery = query(
    collection(db, 'usuarios'),
    where('tipo', '==', 'agronomo'),
  );
  const snapshot = await getDocs(profilesQuery);
  return snapshot.docs.map((profile) => {
    const data = profile.data();
    return {
      uid: profile.id,
      nome: typeof data.nome === 'string' ? data.nome : '',
      email: typeof data.email === 'string' ? data.email : '',
      isAdmin: data.cargo === 'admin',
    };
  }).sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));
}

export async function setAgronomistAdminStatus(uid: string, isAdmin: boolean) {
  if (uid === auth.currentUser?.uid) {
    throw new Error('Você não pode alterar o próprio cargo de administrador.');
  }

  await updateDoc(doc(db, 'usuarios', uid), {
    cargo: isAdmin ? 'admin' : deleteField(),
  });
  return listAdminAgronomists();
}

export async function listAgronomistDeletionHistory(): Promise<AgronomistDeletion[]> {
  const historyQuery = query(deletionCollection, orderBy('excluido_em', 'desc'));
  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    const deletedAt = data.excluido_em;
    const restoredAt = data.restaurado_em;
    return {
      id: entry.id,
      targetUid: typeof data.alvo_uid === 'string' ? data.alvo_uid : '',
      targetName: typeof data.alvo_nome === 'string' ? data.alvo_nome : '',
      targetEmail: typeof data.alvo_email === 'string' ? data.alvo_email : '',
      actorUid: typeof data.ator_uid === 'string' ? data.ator_uid : '',
      actorName: typeof data.ator_nome === 'string' ? data.ator_nome : '',
      actorEmail: typeof data.ator_email === 'string' ? data.ator_email : '',
      deletedAt: deletedAt && typeof deletedAt.toDate === 'function' ? deletedAt.toDate() : null,
      restoredAt: restoredAt && typeof restoredAt.toDate === 'function' ? restoredAt.toDate() : null,
      profile: data.perfil && typeof data.perfil === 'object'
        ? data.perfil as Record<string, unknown>
        : {},
    };
  });
}

export async function removeAgronomistProfile(uid: string) {
  if (uid === auth.currentUser?.uid) {
    throw new Error('Você não pode remover o próprio perfil.');
  }
  const actor = auth.currentUser;
  if (!actor) throw new Error('É necessário estar autenticado como administrador.');
  const actorProfile = await getDoc(doc(db, 'usuarios', actor.uid));
  if (!actorProfile.exists()) throw new Error('O perfil do administrador não foi encontrado.');
  const actorName = actorProfile.data().nome;

  const profileRef = doc(db, 'usuarios', uid);
  const profileSnapshot = await getDoc(profileRef);
  if (!profileSnapshot.exists()) throw new Error('O perfil deste agrônomo não foi encontrado.');
  const profile = profileSnapshot.data();
  if (profile.tipo !== 'agronomo' || profile.cargo === 'admin') {
    throw new Error('Somente perfis de agrônomos sem cargo de administrador podem ser removidos.');
  }

  const areasQuery = query(
    collection(db, 'areas'),
    where('agronomo_id', '==', uid),
  );
  const areasSnapshot = await getDocs(areasQuery);
  if (!areasSnapshot.empty) {
    throw new Error('Transfira ou exclua as áreas deste agrônomo antes de remover o perfil.');
  }

  const batch = writeBatch(db);
  const historyRef = doc(deletionCollection);
  const blockedRef = doc(db, 'usuarios_bloqueados', uid);
  batch.set(historyRef, {
    alvo_uid: uid,
    alvo_nome: profile.nome,
    alvo_email: profile.email,
    ator_uid: actor.uid,
    ator_nome: actorName,
    ator_email: actor.email || '',
    excluido_em: serverTimestamp(),
    perfil: profile,
  });
  batch.set(doc(db, 'usuarios_bloqueados', uid), {
    uid,
    bloqueado_em: serverTimestamp(),
    exclusao_id: historyRef.id,
  });
  batch.delete(profileRef);
  await batch.commit();
  return listAdminAgronomists();
}

export async function restoreAgronomistProfile(deletion: AgronomistDeletion) {
  if (deletion.restoredAt) {
    throw new Error('Este perfil já foi restaurado.');
  }
  if (deletion.targetUid === auth.currentUser?.uid) {
    throw new Error('Você não pode restaurar o próprio perfil.');
  }
  const actor = auth.currentUser;
  if (!actor) throw new Error('É necessário estar autenticado como administrador.');
  const actorProfile = await getDoc(doc(db, 'usuarios', actor.uid));
  if (!actorProfile.exists()) throw new Error('O perfil do administrador não foi encontrado.');

  const batch = writeBatch(db);
  batch.set(doc(db, 'usuarios', deletion.targetUid), deletion.profile);
  batch.delete(doc(db, 'usuarios_bloqueados', deletion.targetUid));
  batch.update(doc(deletionCollection, deletion.id), {
    restaurado_em: serverTimestamp(),
    restaurado_por_uid: actor.uid,
    restaurado_por_nome: actorProfile.data().nome,
  });
  await batch.commit();
  return listAgronomistDeletionHistory();
}
