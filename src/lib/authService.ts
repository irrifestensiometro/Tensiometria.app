import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
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
