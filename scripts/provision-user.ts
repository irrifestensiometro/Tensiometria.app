import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

type AppRole = 'agronomo' | 'produtor';

const [uid, role, adminOption] = process.argv.slice(2);
const projectId = process.env.FIREBASE_PROJECT_ID;

if (
  !uid
  || (role !== 'agronomo' && role !== 'produtor')
  || (adminOption !== undefined && adminOption !== '--admin')
  || (adminOption === '--admin' && role !== 'agronomo')
) {
  console.error('Uso: npm run provision:user -- <UID> <agronomo|produtor> [--admin]');
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

  const customClaims = {
    ...user.customClaims,
  };
  if (adminOption === '--admin') customClaims.admin = true;
  await auth.setCustomUserClaims(userId, customClaims);

  const profileRef = firestore.collection('usuarios').doc(userId);
  const existingProfile = await profileRef.get();
  const profile: Record<string, unknown> = {
    nome: user.displayName || user.email,
    email: user.email,
    tipo: userRole,
  };
  if (!existingProfile.exists) {
    profile.criado_em = FieldValue.serverTimestamp();
  }
  await profileRef.set(profile, { merge: true });

  console.log(`Papel "${userRole}" provisionado para ${user.email} (${userId}).`);
  console.log('O usuario deve sair e entrar novamente para atualizar o token.');
};

provisionUser(uid, role as AppRole).catch((error: unknown) => {
  console.error('Falha ao provisionar usuario:', error);
  process.exitCode = 1;
});
