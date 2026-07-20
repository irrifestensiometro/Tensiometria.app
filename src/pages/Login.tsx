import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { signInWithGooglePopup, registerWithEmail, updateProfile } from '../lib/firebase';
import { salvarUsuario } from '../lib/usuarioService';
import { Droplet, ArrowLeft, Sprout, Activity, Tractor, User, Tractor as TractorIcon } from 'lucide-react';

export default function Login() {
  const { type } = useParams<{ type: 'produtor' | 'agronomo' }>();
  const navigate = useNavigate();
  const { login, setRole, addProdutor, addAgronomo } = useAppContext();
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCadastro, setShowCadastro] = useState(false);

  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('');
  const [cadConfirmar, setCadConfirmar] = useState('');

  const isProdutor = type === 'produtor';
  const roleName = isProdutor ? 'Produtor Rural' : 'Agrônomo';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(email, senha, type as 'produtor' | 'agronomo');
      if (success) {
        navigate(`/${type}/dashboard`);
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch {
      setError('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cadNome.trim() || !cadEmail.trim() || !cadSenha.trim()) {
      setError('Preencha todos os campos.');
      return;
    }
    if (cadSenha !== cadConfirmar) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const credencial = await registerWithEmail(cadEmail.trim(), cadSenha);
      await updateProfile(credencial.user, { displayName: cadNome.trim() });
      await salvarUsuario(credencial.user.uid, {
        nome: cadNome.trim(),
        email: cadEmail.trim(),
        tipo: type as 'agronomo' | 'produtor',
      });
      const novoUsuario = { id: credencial.user.uid, nome: cadNome.trim(), email: cadEmail.trim() };
      if (type === 'produtor') {
        addProdutor(novoUsuario);
      } else {
        addAgronomo(novoUsuario);
      }
      setShowCadastro(false);
      setEmail(cadEmail.trim());
      setSenha(cadSenha);
      setCadNome('');
      setCadEmail('');
      setCadSenha('');
      setCadConfirmar('');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Left Side - Green Banner */}
      <div className="hidden md:flex w-full md:w-1/2 bg-[#2D7D46] text-white p-6 md:p-16 flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-16">
            <div className="bg-white/20 p-2 rounded-lg">
              <Droplet size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-none">IRRIFES</h1>
              <p className="text-[10px] tracking-widest uppercase opacity-80">Tensiometria</p>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Gestão Inteligente de<br />Irrigação
          </h2>
          <p className="text-emerald-50 text-lg mb-12 max-w-md">
            Monitore a umidade do solo em tempo real e otimize sua irrigação com precisão científica.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="bg-white/10 p-4 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
              <Droplet size={24} className="text-emerald-100 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Tensiometria</h3>
                <p className="text-xs text-emerald-100 opacity-80">Monitoramento preciso</p>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
              <Sprout size={24} className="text-emerald-100 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Cultura</h3>
                <p className="text-xs text-emerald-100 opacity-80">Parâmetros otimizados</p>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
              <Activity size={24} className="text-emerald-100 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Análises</h3>
                <p className="text-xs text-emerald-100 opacity-80">Dados em tempo real</p>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl flex items-start space-x-3 backdrop-blur-sm">
              <Tractor size={24} className="text-emerald-100 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Produtividade</h3>
                <p className="text-xs text-emerald-100 opacity-80">Economia de recursos</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-xs text-emerald-200 opacity-60">
          &copy; 2024 IRRIFES Tensiometria. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full md:w-1/2 bg-[#FAFAFA] flex flex-col items-center p-8 relative min-h-screen md:min-h-0">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-8 left-8 text-slate-500 flex items-center space-x-2 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">Voltar</span>
        </button>

        <div className="flex-1" />

        <div className="w-full max-w-sm">
          {isProdutor && showCadastro ? (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="p-4 rounded-2xl mb-4 bg-[#b57d59] text-white shadow-lg">
                  <TractorIcon size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 text-center">Criar Conta</h2>
                <p className="text-slate-500 text-sm mt-2">Cadastre-se como produtor rural</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center space-x-3">
                  <div className="bg-red-100 p-1 rounded-full shrink-0">
                    <Activity size={16} />
                  </div>
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleCadastro} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome completo</label>
                  <input
                    type="text"
                    required
                    value={cadNome}
                    onChange={e => setCadNome(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#b57d59] focus:border-[#b57d59] outline-none transition-all bg-white"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    required
                    value={cadEmail}
                    onChange={e => setCadEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#b57d59] focus:border-[#b57d59] outline-none transition-all bg-white"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha</label>
                  <input
                    type="password"
                    required
                    value={cadSenha}
                    onChange={e => setCadSenha(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#b57d59] focus:border-[#b57d59] outline-none transition-all bg-white"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirmar senha</label>
                  <input
                    type="password"
                    required
                    value={cadConfirmar}
                    onChange={e => setCadConfirmar(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#b57d59] focus:border-[#b57d59] outline-none transition-all bg-white"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] bg-[#b57d59] hover:bg-[#99694b] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-500">
                  Já tem uma conta?{' '}
                  <button onClick={() => { setShowCadastro(false); setError(''); }} className="text-[#b57d59] font-bold hover:underline">
                    Fazer login
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className={`p-4 rounded-2xl mb-4 ${isProdutor ? 'bg-[#b57d59]' : 'bg-[#356b46]'} text-white shadow-lg`}>
                  {isProdutor ? <TractorIcon size={32} /> : <User size={32} />}
                </div>
                <h2 className="text-2xl font-bold text-slate-800 text-center">Acesso {roleName}</h2>
                <p className="text-slate-500 text-sm mt-2">Insira suas credenciais para continuar</p>
              </div>

              {isProdutor && (
                <>
                  <div className="mb-6 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Acesso Rápido</h3>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        setError('');
                        try {
                          const result = await signInWithGooglePopup();
                          setRole('produtor');
                          await salvarUsuario(result.user.uid, {
                            nome: result.user.displayName || result.user.email || '',
                            email: result.user.email || '',
                            tipo: 'produtor',
                          }).catch(() => {});
                          navigate('/produtor/dashboard');
                        } catch (err: any) {
                          if (err.code !== 'auth/popup-closed-by-user') {
                            setError('Erro ao entrar com Google. Tente novamente.');
                          }
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Entrar com Google</span>
                    </button>
                  </div>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#FAFAFA] px-4 text-slate-400 font-medium">ou continue com e-mail</span>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center space-x-3">
                  <div className="bg-red-100 p-1 rounded-full shrink-0">
                    <Activity size={16} />
                  </div>
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail</label>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46] focus:border-[#356b46] outline-none transition-all bg-white"
                    placeholder="seu@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha</label>
                  <input 
                    type="password"
                    required
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46] focus:border-[#356b46] outline-none transition-all bg-white"
                    placeholder="••••••••"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${isProdutor ? 'bg-[#b57d59] hover:bg-[#99694b]' : 'bg-[#356b46] hover:bg-[#2a5538]'}`}
                >
                  {loading ? 'Entrando...' : 'Entrar no Sistema'}
                </button>
              </form>

              {isProdutor && (
                <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                  <p className="text-sm text-slate-500">
                    Ainda não tem uma conta?{' '}
                    <button onClick={() => { setShowCadastro(true); setError(''); }} className="text-[#b57d59] font-bold hover:underline">
                      Criar conta de produtor
                    </button>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex-1" />

        <div className="pt-8 pb-4 text-xs text-slate-400 text-center">
          &copy; 2024 IRRIFES Tensiometria. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
