import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { calcularIrrigacao, ErroCalculoIrrigacao, ResultadoIrrigacao } from '../../lib/irrigationMath';
import { ArrowLeft, Droplet, Check, MapPin, Droplets, Info } from 'lucide-react';
import { LeituraValor } from '../../types';

export default function NovaLeitura() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { areas, addLeitura, leituras } = useAppContext();
  
  const areaId = state?.areaId;
  const area = areas.find(a => a.id === areaId);

  const hoje = new Date().toDateString();
  const leituraHoje = leituras.find(l => l.area_id === areaId && new Date(l.data).toDateString() === hoje);

  const [valores, setValores] = useState<{ [tensiometroId: string]: string }>({});
  const [resultado, setResultado] = useState<ResultadoIrrigacao | null>(null);
  const [erroCalculo, setErroCalculo] = useState<string[]>([]);

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

  let resultadoHoje: ResultadoIrrigacao | null = null;
  if (leituraHoje) {
    try {
      resultadoHoje = calcularIrrigacao(area, leituraHoje.valores);
    } catch {
      resultadoHoje = null;
    }
  }

  const handleCalcular = () => {
    const leiturasFormatadas: LeituraValor[] = area.tensiometros.map(t => ({
      tensiometro_id: t.id,
      leitura_kpa: parseFloat(valores[t.id] || '0')
    }));

    try {
      const res = calcularIrrigacao(area, leiturasFormatadas);
      addLeitura({
        id: Math.random().toString(36).slice(2, 11),
        area_id: area.id,
        data: new Date().toISOString(),
        valores: leiturasFormatadas
      });
      setErroCalculo([]);
      setResultado(res);
    } catch (erro) {
      setErroCalculo(erro instanceof ErroCalculoIrrigacao ? erro.problemas : ['Não foi possível calcular a recomendação.']);
    }
  };

  if (resultado) {
    const temSetorParaIrrigar = resultado.setores.some((setor) => setor.necessitaIrrigacao);
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center rounded-3xl shadow-sm border ${temSetorParaIrrigar ? 'bg-[#f0f9ff] border-[#e0f2fe]' : 'bg-[#f0fdf4] border-[#dcfce7]'}`}>
        <div className={`p-6 rounded-full mb-6 ${temSetorParaIrrigar ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-green-600 text-white shadow-xl shadow-green-200'}`}>
          {temSetorParaIrrigar ? <Droplet size={48} /> : <Check size={48} />}
        </div>
        
        <h2 className={`text-3xl font-black mb-2 ${temSetorParaIrrigar ? 'text-blue-900' : 'text-green-900'}`}>
          Recomendações por setor
        </h2>
        <p className={`text-lg mb-8 ${temSetorParaIrrigar ? 'text-blue-700' : 'text-green-700'}`}>
          Leitura registrada com sucesso.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mb-10 text-left">
          {resultado.setores.map((setor) => (
            <div key={setor.setor} className="bg-white/80 rounded-xl border border-white p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-bold text-slate-800">{setor.setor}</h3>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${setor.necessitaIrrigacao ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {setor.necessitaIrrigacao ? 'Irrigar' : 'Não irrigar'}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-4">{setor.mensagem}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500">Tensão decisão</p><p className="font-black">{setor.tensaoDecisaoKpa?.toFixed(1) ?? '--'} kPa</p></div>
                <div><p className="text-xs text-slate-500">Umidade média</p><p className="font-black">{setor.umidadeMedia !== null ? `${(setor.umidadeMedia * 100).toFixed(1)}%` : '--'}</p></div>
                <div><p className="text-xs text-slate-500">Lâmina líquida</p><p className="font-black">{setor.laminaLiquidaMm.toFixed(1)} mm</p></div>
                <div><p className="text-xs text-slate-500">Lâmina bruta</p><p className="font-black">{setor.laminaBrutaMm.toFixed(1)} mm</p></div>
              </div>
            </div>
          ))}
        </div>

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
              <span>
                {resultadoHoje
                  ? `${resultadoHoje.setores.filter(setor => setor.necessitaIrrigacao).length} setor(es) para irrigar`
                  : 'Leitura realizada'}
              </span>
            </div>
          )}
        </div>
      </div>

      {leituraHoje && (
        <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-2xl p-6">
          <h3 className="font-bold text-slate-800 flex items-center mb-4">
            Status Atual <Info size={16} className="ml-2 text-slate-400" />
          </h3>
          <div className="space-y-2">
            {resultadoHoje?.setores.map((setor) => (
              <div key={setor.setor} className="bg-white/70 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">{setor.setor}</p>
                  <p className="text-xs text-slate-500">
                    Tensão {setor.tensaoDecisaoKpa?.toFixed(1) ?? '--'} kPa · Umidade {setor.umidadeMedia !== null ? `${(setor.umidadeMedia * 100).toFixed(1)}%` : '--'}
                  </p>
                </div>
                <p className={`font-bold ${setor.necessitaIrrigacao ? 'text-blue-700' : 'text-green-700'}`}>
                  {setor.necessitaIrrigacao ? `${setor.mensagem} · ${setor.laminaBrutaMm.toFixed(1)} mm` : 'Não irrigar'}
                </p>
              </div>
            ))}
            {!resultadoHoje && (
              <p className="text-sm text-amber-800">Revise os parâmetros técnicos da área para obter recomendações por setor.</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Nova Leitura</h2>
          <p className="text-slate-500 text-sm mt-1">Insira os valores atuais dos tensiômetros (kPa)</p>
        </div>
        {erroCalculo.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">{erroCalculo.map(problema => <li key={problema}>{problema}</li>)}</ul>
          </div>
        )}
        
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
                        min="0"
                        max="100"
                        step="0.1"
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
