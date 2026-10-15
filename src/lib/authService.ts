import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  inMemoryPersistence,
  reauthenticateWithCredential,
  setPersistence,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, criarInstanciaFirebaseIsolada } from './firebase';
import {
  buscarUsuario,
  criarPerfilAgronomoAdministrativamente,
  concluirTrocaSenhaInicial,
  garantirPerfilUsuario,
  type UsuarioData,
} from './usuarioService';

export type UserRole = UsuarioData['tipo'];

export const trocarSenhaInicialAgronomo = async (novaSenha: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Não há uma conta autenticada para trocar a senha.');
  const profile = await buscarUsuario(user.uid);
  if (profile?.tipo !== 'agronomo' || profile.troca_senha_pendente !== true) {
    throw new Error('Esta conta não possui uma troca de senha inicial pendente.');
  }

  await updatePassword(user, novaSenha);
  await concluirTrocaSenhaInicial(user.uid);
};

export const alterarSenhaAgronomo = async (senhaAtual: string, novaSenha: string) => {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('Não foi possível identificar a conta autenticada.');
  }

  const credential = EmailAuthProvider.credential(user.email, senhaAtual);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, novaSenha);
};

export class UserRoleAuthorizationError extends Error {
  readonly code = 'auth/role-not-authorized';

  constructor(
    readonly uid: string,
    readonly requestedRole: UserRole,
  ) {
    super(`A conta ainda não está autorizada como ${requestedRole}.`);
    this.name = 'UserRoleAuthorizationError';
  }
}

export const validarAcessoPorPapel = async (user: User, requestedRole: UserRole) => {
  const profile = await garantirPerfilUsuario(user, requestedRole);

  if (!profile || profile.tipo !== requestedRole || profile.email !== user.email) {
    await signOut(auth);
    throw new UserRoleAuthorizationError(user.uid, requestedRole);
  }

  return profile;
};

export const criarContaDeAgronomo = async (nome: string, email: string, password: string) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('É necessário estar autenticado como agrônomo para criar outra conta.');
  }
  const profile = await buscarUsuario(user.uid);
  if (profile?.tipo !== 'agronomo') {
    throw new Error('Somente um agrônomo autenticado pode criar outra conta de agrônomo.');
  }

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('A chave pública de configuração do Firebase não está definida.');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName: nome,
        returnSecureToken: false,
      }),
    },
  );
  const result = await response.json() as {
    localId?: string;
    error?: { message?: string };
  };

  if (!response.ok || !result.localId) {
    const code = result.error?.message;
    if (code === 'EMAIL_EXISTS') throw new Error('Este e-mail já possui uma conta.');
    if (code?.startsWith('WEAK_PASSWORD')) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    throw new Error(`O Firebase não conseguiu criar a conta${code ? `: ${code}` : '.'}`);
  }

  try {
    await criarPerfilAgronomoAdministrativamente(result.localId, nome, email);
  } catch (error) {
    throw new Error(
      `A conta foi criada, mas o perfil não pôde ser salvo. UID ${result.localId}. ${error instanceof Error ? error.message : ''}`,
    );
  }

  return result.localId;
};

export const criarContaDeProdutor = async (nome: string, email: string, password: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('É necessário estar autenticado como agrônomo para cadastrar um produtor.');
  }

  const currentProfile = await buscarUsuario(currentUser.uid);
  if (currentProfile?.tipo !== 'agronomo') {
    throw new Error('Somente um agrônomo autenticado pode cadastrar produtores.');
  }

  const normalizedName = nome.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName || normalizedName.length > 120) {
    throw new Error('Informe o nome do produtor com até 120 caracteres.');
  }
  if (!normalizedEmail || password.length < 6) {
    throw new Error('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.');
  }

  const isolated = criarInstanciaFirebaseIsolada();
  let createdUser: User | null = null;
  try {
    await setPersistence(isolated.auth, inMemoryPersistence);
    const credential = await createUserWithEmailAndPassword(
      isolated.auth,
      normalizedEmail,
      password,
    );
    createdUser = credential.user;
    await updateProfile(createdUser, { displayName: normalizedName });
    await setDoc(doc(isolated.db, 'usuarios', createdUser.uid), {
      nome: normalizedName,
      email: createdUser.email ?? normalizedEmail,
      tipo: 'produtor',
      cpf_prompted: false,
      criado_em: serverTimestamp(),
    });
    return createdUser.uid;
  } catch (error) {
    if (createdUser) {
      try {
        await deleteUser(createdUser);
      } catch (rollbackError) {
        throw new Error(
          `Não foi possível salvar o perfil do produtor e a conta de autenticação não pôde ser removida (UID ${createdUser.uid}). ${error instanceof Error ? error.message : 'Erro desconhecido.'} Falha ao remover a conta: ${rollbackError instanceof Error ? rollbackError.message : 'erro desconhecido.'}`,
        );
      }
    }

    const code = typeof error === 'object'
      && error !== null
      && 'code' in error
      && typeof error.code === 'string'
      ? error.code
      : undefined;
    if (code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail já possui uma conta.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    if (createdUser) {
      throw new Error(
        `Não foi possível concluir o cadastro do produtor: ${error instanceof Error ? error.message : 'erro desconhecido.'}`,
      );
    }
    throw error;
  } finally {
    await isolated.dispose();
  }
};
