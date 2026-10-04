import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

const [uid] = process.argv.slice(2);
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!uid) {
  console.error('Uso: npm run delete:agronomist -- <UID>');
  process.exit(1);
}

if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'Defina FIREBASE_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS para uma credencial administrativa fora do repositorio.',
  );
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const confirmDeletion = async (userId: string) => {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Execute a exclusao em um terminal interativo para confirmar o UID.');
  }
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const confirmation = await readline.question(
      `Para excluir permanentemente a conta e o perfil ${userId}, digite o UID completo: `,
    );
    if (confirmation !== userId) {
      throw new Error('UID de confirmacao diferente; exclusao cancelada.');
    }
  } finally {
    readline.close();
  }
};

const deleteAgronomist = async (userId: string) => {
  await confirmDeletion(userId);
  const auth = getAuth();
  const firestore = getFirestore();
  const profileRef = firestore.collection('usuarios').doc(userId);
  const profileSnapshot = await profileRef.get();

  if (!profileSnapshot.exists || profileSnapshot.data()?.tipo !== 'agronomo') {
    throw new Error('O UID informado nao possui um perfil de agronomo.');
  }

  const areasSnapshot = await firestore
    .collection('areas')
    .where('agronomo_id', '==', userId)
    .limit(1)
    .get();
  if (!areasSnapshot.empty) {
    throw new Error('Este agronomo ainda possui areas. Transfira ou exclua essas areas antes de remover a conta.');
  }

  try {
    await auth.getUser(userId);
    if (profileSnapshot.data()?.cargo === 'admin') {
      throw new Error('Remova o cargo admin com --remove-admin antes de excluir esta conta.');
    }
    await auth.deleteUser(userId);
  } catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'auth/user-not-found'
    ) {
      console.warn('A conta de autenticacao ja nao existe; removendo o perfil restante.');
    } else {
      throw error;
    }
  }

  try {
    await profileRef.delete();
  } catch (error) {
    throw new Error(
      `A conta de autenticacao foi excluida, mas o perfil Firestore nao pode ser removido. Execute o comando novamente para concluir a limpeza: ${error instanceof Error ? error.message : 'erro desconhecido.'}`,
    );
  }
  console.log(`Conta de agronomo excluida: ${userId}.`);
};

deleteAgronomist(uid).catch((error: unknown) => {
  console.error('Falha ao excluir agronomo:', error);
  process.exitCode = 1;
});
