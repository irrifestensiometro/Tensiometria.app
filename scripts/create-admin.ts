import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { stdin, stdout } from 'node:process';

const [emailArgument, nameArgument] = process.argv.slice(2);
const email = emailArgument?.trim().toLowerCase();
const displayName = nameArgument?.trim() || 'Administrador agrônomo';
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!email || !email.includes('@')) {
  console.error('Uso: npm run provision:admin -- <email> ["Nome do administrador"]');
  process.exit(1);
}

if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'Defina FIREBASE_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS para uma credencial administrativa fora do repositório.',
  );
  process.exit(1);
}

const promptHidden = (label: string) => new Promise<string>((resolve, reject) => {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    reject(new Error('Execute este comando em um terminal interativo para digitar a senha com segurança.'));
    return;
  }

  const bytes: number[] = [];
  const finish = (error?: Error) => {
    stdin.removeListener('data', onData);
    stdin.setRawMode(false);
    stdin.pause();
    stdout.write('\n');
    if (error) reject(error);
    else resolve(Buffer.from(bytes).toString('utf8'));
  };
  const onData = (chunk: Buffer) => {
    for (const byte of chunk) {
      if (byte === 3) {
        finish(new Error('Operação cancelada.'));
        return;
      }
      if (byte === 13 || byte === 10) {
        finish();
        return;
      }
      if (byte === 8 || byte === 127) {
        if (bytes.length > 0) {
          bytes.pop();
          while (bytes.length > 0 && (bytes[bytes.length - 1] & 0xc0) === 0x80) {
            bytes.pop();
          }
        }
        continue;
      }
      if (byte >= 32) bytes.push(byte);
    }
  };

  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.on('data', onData);
});

const createAdmin = async () => {
  const password = await promptHidden('Digite uma senha nova (mínimo 12 caracteres): ');
  const confirmation = await promptHidden('Confirme a senha: ');
  if (password.length < 12) {
    throw new Error('Use uma senha com pelo menos 12 caracteres.');
  }
  if (password !== confirmation) {
    throw new Error('As senhas não conferem.');
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });

  const auth = getAuth();
  const user = await auth.createUser({
    email,
    password,
    displayName,
  });

  try {
    await getFirestore().collection('usuarios').doc(user.uid).set({
      nome: displayName,
      email,
      tipo: 'agronomo',
      cargo: 'admin',
      criado_em: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(
      `A conta foi criada, mas o perfil não foi concluído. UID: ${user.uid}. ` +
      `Tente novamente com: npm run provision:user -- ${user.uid} agronomo --admin`,
    );
    throw error;
  }

  console.log(`Administrador agrônomo criado: ${email} (UID: ${user.uid}).`);
  console.log('Atualize o app para carregar o novo papel de administrador.');
};

createAdmin().catch((error: unknown) => {
  console.error('Falha ao criar o administrador:', error);
  process.exitCode = 1;
});
