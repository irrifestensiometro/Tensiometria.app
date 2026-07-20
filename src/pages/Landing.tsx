import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Tractor, ArrowRight, CheckCircle2, Users, Zap, FlaskConical, Target } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="font-sans">

      {/* ---- NAV ---- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-[#356b46] to-[#2D7D46] p-2 rounded-lg">
              <Droplet size={20} className="text-white" />
            </div>
            <span className="font-extrabold text-lg text-slate-800">IRRIFES</span>
          </button>

          <div className="hidden md:flex items-center space-x-8 text-sm">
            <button onClick={() => scrollTo('sobre')} className="text-slate-500 hover:text-slate-800 transition-colors">Sobre</button>
            <button onClick={() => scrollTo('como-funciona')} className="text-slate-500 hover:text-slate-800 transition-colors">Como Funciona</button>
            <button onClick={() => scrollTo('beneficios')} className="text-slate-500 hover:text-slate-800 transition-colors">Benefícios</button>
            <button
              onClick={() => navigate('/login/produtor')}
              className="bg-[#356b46] hover:bg-[#2a5538] text-white px-5 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              Acessar Sistema
            </button>
          </div>

          <button onClick={() => navigate('/login/produtor')} className="md:hidden bg-[#356b46] text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors">
            Entrar
          </button>
        </div>
      </nav>

      {/* ---- HERO ---- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f0faf0] via-white to-[#faf5f0]">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, #356b46 0%, transparent 50%), radial-gradient(circle at 80% 20%, #b57d59 0%, transparent 50%)`
        }} />
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-[#356b46]/10 p-2 rounded-lg">
                <Droplet size={20} className="text-[#356b46]" />
              </div>
              <span className="text-sm font-semibold text-[#356b46] tracking-wider uppercase">IRRIFES Tensiometria</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-800 leading-[1.05] tracking-tight mb-6">
              A física do solo traduzida na{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#356b46] to-[#2D7D46]">decisão certa</span>
              {' '}de irrigação.
            </h1>

            <p className="text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed mb-10">
              O IRRIFES conecta a precisão do agrônomo à rotina do produtor rural, garantindo o manejo ideal da água por tensiometria em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login/produtor')}
                className="bg-[#356b46] hover:bg-[#2a5538] text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg shadow-green-200 hover:shadow-xl transition-all flex items-center justify-center space-x-2"
              >
                <span>Quero otimizar minha irrigação</span>
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/login/agronomo')}
                className="bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-2xl font-bold text-base border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Users size={18} />
                <span>Sou Agrônomo / Consultor</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---- SOBRE ---- */}
      <section id="sobre" className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-xs font-bold text-[#356b46] tracking-[0.2em] uppercase bg-[#356b46]/5 px-4 py-2 rounded-full">Sobre Nós</span>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed mt-8">
              O IRRIFES nasceu para resolver um dos maiores desafios do agronegócio moderno: irrigar nem mais, nem menos do que a planta precisa. Unimos o rigor científico do manejo físico-hídrico do solo à simplicidade operacional no campo, promovendo a sustentabilidade do uso da água e o ganho real de produtividade.
            </p>
          </div>
        </div>
      </section>

      {/* ---- COMO FUNCIONA ---- */}
      <section id="como-funciona" className="bg-gradient-to-br from-[#f0faf0] via-white to-[#faf5f0] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[#356b46] tracking-[0.2em] uppercase bg-[#356b46]/5 px-4 py-2 rounded-full">Como Funciona</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-4">Duas visões, um único objetivo</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* Card Produtor */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:shadow-2xl transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#b57d59]/5 rounded-bl-full" />
              <div className="relative">
                <div className="bg-[#b57d59]/10 p-4 rounded-2xl w-fit mb-6">
                  <Tractor size={32} className="text-[#b57d59]" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Para o Produtor Rural</h3>
                <p className="text-slate-500 text-sm mb-6">Tecnologia que simplifica o dia a dia no campo.</p>
                <ul className="space-y-4">
                  {[
                    'Simplicidade no campo: input rápido de leituras',
                    'Respostas diretas de quando e quanto irrigar',
                    'Visualização por mapas georreferenciados',
                  ].map(item => (
                    <li key={item} className="flex items-start space-x-3">
                      <CheckCircle2 size={18} className="text-[#b57d59] shrink-0 mt-0.5" />
                      <span className="text-slate-600 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card Agrônomo */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:shadow-2xl transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#356b46]/5 rounded-bl-full" />
              <div className="relative">
                <div className="bg-[#356b46]/10 p-4 rounded-2xl w-fit mb-6">
                  <Users size={32} className="text-[#356b46]" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Para o Agrônomo / Consultor</h3>
                <p className="text-slate-500 text-sm mb-6">Precisão técnica para gestão profissional.</p>
                <ul className="space-y-4">
                  {[
                    'Precisão técnica (θcc, θpmp, Z, Ea, Ip, tensão crítica)',
                    'Desenho e gestão de polígonos por área no mapa',
                    'Gestão centralizada de múltiplos produtores e histórico de dados',
                  ].map(item => (
                    <li key={item} className="flex items-start space-x-3">
                      <CheckCircle2 size={18} className="text-[#356b46] shrink-0 mt-0.5" />
                      <span className="text-slate-600 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- BENEFÍCIOS ---- */}
      <section id="beneficios" className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[#356b46] tracking-[0.2em] uppercase bg-[#356b46]/5 px-4 py-2 rounded-full">Benefícios</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-4">Por que escolher o IRRIFES?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="bg-emerald-50 p-4 rounded-2xl w-fit mx-auto mb-5">
                <Zap size={28} className="text-[#356b46]" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-3">Economia Real</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Redução no uso de água e energia elétrica com irrigação de precisão baseada em dados reais do solo.</p>
            </div>

            <div className="text-center p-8">
              <div className="bg-emerald-50 p-4 rounded-2xl w-fit mx-auto mb-5">
                <FlaskConical size={28} className="text-[#356b46]" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-3">Decisão Científica</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Fim do "achismo" — decisões baseadas no estresse hídrico controlado e parâmetros físico-hídricos do solo.</p>
            </div>

            <div className="text-center p-8">
              <div className="bg-emerald-50 p-4 rounded-2xl w-fit mx-auto mb-5">
                <Target size={28} className="text-[#356b46]" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-3">Alinhamento Total</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Gestão técnica no topo, execução simplificada no campo — todos falando a mesma língua.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA FINAL ---- */}
      <section className="bg-gradient-to-br from-[#356b46] to-[#2D7D46] py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-6">
            Pronto para transformar a gestão de água na sua propriedade?
          </h2>
          <p className="text-emerald-100/80 text-lg mb-10 max-w-xl mx-auto">
            Junte-se aos produtores que já economizam água e aumentam a produtividade com o IRRIFES.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/contato')}
              className="bg-white text-[#356b46] hover:bg-emerald-50 px-8 py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
            >
              <span>Falar com um Especialista</span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/login/produtor')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-base transition-all"
            >
              Criar Conta Gratuita
            </button>
          </div>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2">
              <div className="bg-white/10 p-2 rounded-lg">
                <Droplet size={18} className="text-white" />
              </div>
              <span className="font-bold text-white text-lg">IRRIFES</span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <button onClick={() => scrollTo('sobre')} className="hover:text-white transition-colors">Sobre</button>
              <button onClick={() => scrollTo('como-funciona')} className="hover:text-white transition-colors">Como Funciona</button>
              <button onClick={() => scrollTo('beneficios')} className="hover:text-white transition-colors">Benefícios</button>
              <button onClick={() => navigate('/contato')} className="hover:text-white transition-colors">Contato</button>
              <button onClick={() => navigate('/login/produtor')} className="hover:text-white transition-colors">Acessar</button>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-xs">
            &copy; 2024 IRRIFES Tensiometria. Todos os direitos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
