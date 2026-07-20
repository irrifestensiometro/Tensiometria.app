import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { calcularIrrigacao } from '../../lib/irrigationMath';
import { ArrowLeft, Droplet, Check, MapPin, Gauge, Droplets, Info } from 'lucide-react';
import { LeituraValor } from '../../types';

export default function NovaLeitura() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { areas, addLeitura, leituras } = useAppContext();
  
  const areaId = state?.areaId;
  const area = areas.find(a => a.id === areaId);

  const hoje = new Date().toISOString().split('T')[0];
  const leituraHoje = leituras.find(l => l.area_id === areaId && l.data.startsWith(hoje));

  const [valores, setValores] = useState<{ [tensiometroId: string]: string }>({});
  const [resultado, setResultado] = useState<{ necessitaIrrigacao: boolean, tempoHoras: number, mensagem: string } | null>(null);

  if (!area) {
    return <div className="p-4 text-center">Área não encontrada.</div>;
  }

  const setores = useMemo(() => {
    const grupos = new Map<string, typeof area.tensiometros>();
    area.tensiometros.forEach(t => {
      const setor = t.setor || 'Tensiômetros';
      if (!grupos.has(setor)) grupos.set(setor, []);
      grupos.get(setor)!.push(t);
    });
    return Array.from(grupos.entries());
  }, [area.tensiometros]);

  const handleCalcular = () => {
    const leiturasFormatadas: LeituraValor[] = area.tensiometros.map(t => ({
      tensiometro_id: t.id,
      leitura_kpa: parseFloat(valores[t.id] || '0')
    }));

    const res = calcularIrrigacao(area, leiturasFormatadas);
    
    addLeitura({
      id: Math.random().toString(36).substr(2, 9),
      area_id: area.id,
      data: new Date().toISOString(),
      valores: leiturasFormatadas
    });

    setResultado(res);
  };

  if (resultado) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center rounded-3xl shadow-sm border ${resultado.necessitaIrrigacao ? 'bg-[#f0f9ff] border-[#e0f2fe]' : 'bg-[#f0fdf4] border-[#dcfce7]'}`}>
        <div className={`p-6 rounded-full mb-6 ${resultado.necessitaIrrigacao ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-green-600 text-white shadow-xl shadow-green-200'}`}>
          {resultado.necessitaIrrigacao ? <Droplet size={48} /> : <Check size={48} />}
        </div>
        
        <h2 className={`text-4xl font-black mb-2 ${resultado.necessitaIrrigacao ? 'text-blue-900' : 'text-green-900'}`}>
          {resultado.mensagem}
        </h2>
        <p className={`text-lg mb-10 ${resultado.necessitaIrrigacao ? 'text-blue-700' : 'text-green-700'}`}>
          Leitura registrada com sucesso.
        </p>

        <button 
          onClick={() => navigate('/produtor/dashboard')}
          className="w-full max-w-sm py-4 rounded-xl text-lg font-bold bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full space-y-6 animate-in fade-in duration-300">
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <ArrowLeft size={16} />
          <span className="font-bold text-sm">Voltar</span>
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 truncate">{area.nome}</h1>
            <div className="flex items-center text-slate-500 mt-2">
              <MapPin size={16} className="mr-1" />
              <span>{area.poligono ? 'Área mapeada' : 'Localização não definida'}</span>
            </div>
          </div>
          {leituraHoje && (
            <div className="bg-[#e0f2fe] text-blue-700 px-4 py-2 rounded-full font-bold flex items-center space-x-2 text-sm border border-[#bae6fd]">
              <Droplets size={16} />
              <span>Solo Saturado</span>
            </div>
          )}
        </div>
      </div>

      {leituraHoje && (
        <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-2xl p-6">
          <h3 className="font-bold text-slate-800 flex items-center mb-6">
            Status Atual <Info size={16} className="ml-2 text-slate-400" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/60 p-4 rounded-xl flex items-center space-x-4">
              <Gauge size={24} className="text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Última leitura</p>
                <p className="font-black text-slate-800 text-lg">
                  {leituraHoje.valores[0]?.leitura_kpa || 0} <span className="text-sm font-normal text-slate-500">kPa</span>
                </p>
              </div>
            </div>
            <div className="bg-white/60 p-4 rounded-xl flex items-center space-x-4">
              <Droplets size={24} className="text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Umidade estimada</p>
                <p className="font-black text-slate-800 text-lg">
                  28.6 <span className="text-sm font-normal text-slate-500">%</span>
                </p>
              </div>
            </div>
            <div className="bg-white/60 p-4 rounded-xl flex items-center space-x-4">
              <Droplet size={24} className="text-blue-500" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Irrigação</p>
                <p className="font-black text-green-600 text-lg">Não</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-blue-700">
            <div className="bg-blue-100 p-2 rounded-full">
              <Droplets size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-sm">Solo Saturado</p>
              <p className="text-xs opacity-80">Aguarde drenagem antes de irrigar novamente.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Nova Leitura</h2>
          <p className="text-slate-500 text-sm mt-1">Insira os valores atuais dos tensiômetros (kPa)</p>
        </div>
        
        <div className="space-y-6 mb-8">
          {setores.map(([nomeSetor, tensiometros]) => (
            <div key={nomeSetor} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-[#f5e6de] px-6 py-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{nomeSetor}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                {tensiometros.map(t => (
                  <div key={t.id} className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <label className="block text-slate-500 font-bold mb-3 text-sm">Profundidade: {t.prof_cm} cm</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        inputMode="numeric"
                        placeholder="0"
                        value={valores[t.id] || ''}
                        onChange={(e) => setValores(prev => ({ ...prev, [t.id]: e.target.value }))}
                        className="w-full text-center text-4xl font-black text-slate-800 bg-white rounded-xl py-6 pr-12 border border-slate-200 focus:border-[#b57d59] focus:ring-4 focus:ring-[#f5e6de] outline-none transition-all shadow-sm"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">kPa</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleCalcular}
          disabled={area.tensiometros.some(t => !valores[t.id])}
          className="w-full bg-[#b57d59] hover:bg-[#99694b] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-5 rounded-xl font-bold text-xl transition-all"
        >
          Calcular Recomendação
        </button>
      </div>
    </div>
  );
}
