import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Sprout, Activity, Tractor, User, Tractor as TractorIcon, ChevronRight } from 'lucide-react';

const CARDS = [
  { icon: Droplet, title: 'Tensiometria', desc: 'Monitoramento preciso do solo em tempo real' },
  { icon: Sprout, title: 'Cultura', desc: 'Parâmetros otimizados para cada cultura' },
  { icon: Activity, title: 'Análises', desc: 'Dados e gráficos para decisões precisas' },
  { icon: Tractor, title: 'Produtividade', desc: 'Economia de água e aumento de safra' },
];

const RENDERED_CARDS = [...CARDS, ...CARDS, ...CARDS];

export default function Home() {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      const card = el.children[0] as HTMLElement | undefined;
      if (!card) return;
      const step = card.offsetWidth + 16;
      const maxScroll = step * CARDS.length * 2;
      if (el.scrollLeft + step >= maxScroll) {
        el.scrollLeft = 0;
      }
      el.scrollBy({ left: step, behavior: 'smooth' });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#f0faf0] via-white to-[#faf5f0]">
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Side */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-20">
          <div>
            <div className="flex items-center space-x-3 mb-10 md:mb-14">
              <div className="bg-gradient-to-br from-[#356b46] to-[#2D7D46] p-3 rounded-2xl shadow-lg shadow-green-200">
                <Droplet size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold leading-none text-slate-800 tracking-tight">IRRIFES</h1>
                <p className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold">Tensiometria</p>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-[1.1] text-slate-800 tracking-tight">
              Gestão Inteligente<br />de Irrigação
            </h2>
            <p className="text-slate-500 text-base md:text-lg mb-8 md:mb-10 max-w-md leading-relaxed">
              Monitore a umidade do solo em tempo real e transforme dados em economia.
            </p>

            <div ref={carouselRef} className="flex gap-4 overflow-x-hidden scrollbar-hidden rounded-2xl">
              {RENDERED_CARDS.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={`${card.title}-${idx}`}
                    className="bg-gradient-to-br from-[#2D7D46] to-[#356b46] text-white p-6 rounded-2xl flex items-start space-x-4 shrink-0 w-full shadow-lg shadow-green-200"
                  >
                    <div className="bg-white/15 p-3 rounded-xl shrink-0">
                      <Icon size={26} className="text-emerald-100" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base mb-1">{card.title}</h3>
                      <p className="text-sm text-emerald-100/80 leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side - Login Options */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 lg:p-20">
          <div className="w-full max-w-sm">
            <div className="space-y-4">
              <button
                onClick={() => navigate('/login/agronomo')}
                className="group w-full bg-white hover:bg-[#356b46] text-slate-700 hover:text-white rounded-2xl p-5 flex items-center shadow-md hover:shadow-xl border border-slate-200 hover:border-[#356b46] transition-all duration-300 active:scale-[0.98] text-left"
              >
                <div className="bg-[#356b46]/10 group-hover:bg-white/20 p-3 rounded-xl mr-4 transition-colors">
                  <User size={22} className="text-[#356b46] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">Entrar como Agrônomo</h3>
                  <p className="text-xs text-slate-400 group-hover:text-white/70 transition-colors">Gerencie áreas e vincule produtores</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-white/70 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/login/produtor')}
                className="group w-full bg-white hover:bg-[#b57d59] text-slate-700 hover:text-white rounded-2xl p-5 flex items-center shadow-md hover:shadow-xl border border-slate-200 hover:border-[#b57d59] transition-all duration-300 active:scale-[0.98] text-left"
              >
                <div className="bg-[#b57d59]/10 group-hover:bg-white/20 p-3 rounded-xl mr-4 transition-colors">
                  <TractorIcon size={22} className="text-[#b57d59] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">Entrar como Produtor Rural</h3>
                  <p className="text-xs text-slate-400 group-hover:text-white/70 transition-colors">Insira leituras e acompanhe recomendações</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-white/70 transition-colors" />
              </button>
            </div>

            <div className="mt-8 text-center">
              <span className="text-sm text-slate-400">Não tem uma conta? </span>
              <button
                onClick={() => navigate('/login/produtor')}
                className="text-sm font-bold text-[#356b46] hover:text-[#2a5538] hover:underline transition-colors"
              >
                Criar conta de produtor
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 text-xs text-slate-400 text-center border-t border-slate-200/60">
        <button onClick={() => navigate('/sobre-nos')} className="hover:text-[#356b46] transition-colors font-medium mr-4">
          Sobre Nós
        </button>
        &copy; 2024 IRRIFES Tensiometria. Todos os direitos reservados.
      </div>
    </div>
  );
}
