import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

type AppRole = 'agronomo' | 'produtor';

const [uid, role, adminOption] = process.argv.slice(2);
const projectId = process.env.FIREBASE_PROJECT_ID;

if (
  !uid
  || (role !== 'agronomo' && role !== 'produtor')
  || (adminOption !== undefined && adminOption !== '--admin' && adminOption !== '--remove-admin')
  || (adminOption !== undefined && role !== 'agronomo')
) {
  console.error('Uso: npm run provision:user -- <UID> <agronomo|produtor> [--admin|--remove-admin]');
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

const provisionUser = async (userId: string, userRole: AppRole) => {
  const auth = getAuth();
  const firestore = getFirestore();
  const user = await auth.getUser(userId);
  if (!user.email) {
    throw new Error('O usuario do Firebase Authentication precisa ter um e-mail.');
  }
  const profileRef = firestore.collection('usuarios').doc(userId);
  const existingProfile = await profileRef.get();
  const existingRole = existingProfile.data()?.tipo;
  if (existingProfile.exists && existingRole !== userRole) {
    throw new Error(`O perfil ja esta cadastrado como "${String(existingRole)}"; nao e permitido trocar o tipo por este comando.`);
  }
  if (adminOption && (!existingProfile.exists || existingRole !== 'agronomo')) {
    throw new Error('Promocao e remocao de admin exigem um perfil de agronomo existente.');
  }
  if (userRole === 'produtor' && existingProfile.data()?.cargo === 'admin') {
    throw new Error('Uma conta administradora nao pode ser provisionada como produtor.');
  }

  if (adminOption === '--remove-admin' && existingProfile.data()?.cargo === 'admin') {
    const administrators = await firestore.collection('usuarios')
      .where('cargo', '==', 'admin')
      .get();
    const otherAdminExists = administrators.docs.some((profile) =>
      profile.id !== userId && profile.data().tipo === 'agronomo',
    );
    if (!otherAdminExists) {
      throw new Error('Nao e permitido remover o ultimo administrador. Promova outro agronomo primeiro.');
    }
  }

  const profile: Record<string, unknown> = {
    nome: user.displayName || user.email,
    email: user.email,
    tipo: userRole,
  };
  if (!existingProfile.exists) {
    profile.criado_em = FieldValue.serverTimestamp();
    if (userRole === 'agronomo') profile.troca_senha_pendente = true;
  }
  if (adminOption === '--admin') profile.cargo = 'admin';
  if (adminOption === '--remove-admin') profile.cargo = FieldValue.delete();
  await profileRef.set(profile, { merge: true });

  console.log(`Papel "${userRole}" provisionado para ${user.email} (${userId}).`);
  console.log('Atualize o app para carregar as alteracoes do perfil.');
};

provisionUser(uid, role as AppRole).catch((error: unknown) => {
  console.error('Falha ao provisionar usuario:', error);
  process.exitCode = 1;
});
