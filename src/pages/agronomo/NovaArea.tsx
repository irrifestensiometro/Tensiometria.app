import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeft, Check, Plus, Trash2, MapPin, Info, Sparkles } from 'lucide-react';
import { Area, Produtor } from '../../types';
import { validarParametrosIrrigacao } from '../../lib/irrigationMath';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl } from 'react-leaflet';
import { initLeafletIcons } from '../../lib/leaflet-setup';
import { PolygonDrawer } from '../../components/map/MapUtils';
import { Tooltip } from '../../components/ui/Tooltip';
import { FieldLabel } from '../../components/ui/FieldLabel';

initLeafletIcons();

const SUGESTOES_CULTURA = [
  { nome: 'Milho', prof_raiz_mm: 600 },
  { nome: 'Soja', prof_raiz_mm: 400 },
  { nome: 'Feijão', prof_raiz_mm: 300 },
  { nome: 'Café', prof_raiz_mm: 800 },
  { nome: 'Cana-de-açúcar', prof_raiz_mm: 1000 },
  { nome: 'Algodão', prof_raiz_mm: 700 },
  { nome: 'Arroz', prof_raiz_mm: 300 },
  { nome: 'Trigo', prof_raiz_mm: 400 },
  { nome: 'Pastagem', prof_raiz_mm: 500 },
  { nome: 'Hortaliças', prof_raiz_mm: 200 },
];

export default function NovaArea() {
  const navigate = useNavigate();
  const { areaId } = useParams();
  const { produtores, currentUser, areas, addArea, updateArea } = useAppContext();
  const areaEmEdicao = areaId ? areas.find(area => area.id === areaId) : undefined;

  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const [formData, setFormData] = useState({
    nome: '',
    produtor_id: '',
    coef_a: '',
    coef_b: '',
    umidade_cc: '',
    prof_raiz_mm: '',
    eficiencia_ea: '',
    vazao_ip: '',
    pam: ''
  });

  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [selectedProdutor, setSelectedProdutor] = useState<Produtor | null>(null);

  const [culturaSugerida, setCulturaSugerida] = useState('');
  const [formError, setFormError] = useState<string[]>([]);
  const [edicaoCarregada, setEdicaoCarregada] = useState(false);

  useEffect(() => {
    if (formData.produtor_id) {
      const prod = produtores.find(p => p.id === formData.produtor_id);
      setSelectedProdutor(prod || null);
    } else {
      setSelectedProdutor(null);
    }
  }, [formData.produtor_id, produtores]);

  const mapCenter: [number, number] = selectedProdutor?.localizacao_sede
    ? [selectedProdutor.localizacao_sede.lat, selectedProdutor.localizacao_sede.lng]
    : [-20.3155, -40.3128];

  type SetorForm = {
    id: string;
    nome: string;
    tensiometros: {
      id: string;
      prof_cm: number;
      camada_inicio_cm: number;
      camada_fim_cm: number;
      tipo: 'decisao' | 'controle';
      tensao_critica: number;
    }[];
  };

  const novoTensiometro = (sufixo = '') => ({
    id: `t_${Date.now()}${sufixo}`,
    prof_cm: 15,
    camada_inicio_cm: 0,
    camada_fim_cm: 30,
    tipo: 'decisao' as const,
    tensao_critica: 40,
  });

  const [setores, setSetores] = useState<SetorForm[]>([
    { id: 'setor_1', nome: 'Setor 1', tensiometros: [novoTensiometro()] }
  ]);

  useEffect(() => {
    if (!areaEmEdicao || edicaoCarregada) return;
    setFormData({
      nome: areaEmEdicao.nome,
      produtor_id: areaEmEdicao.produtor_id,
      coef_a: String(areaEmEdicao.solo.coef_a),
      coef_b: String(areaEmEdicao.solo.coef_b),
      umidade_cc: String(areaEmEdicao.solo.umidade_cc),
      prof_raiz_mm: String(areaEmEdicao.planta.prof_raiz_mm),
      eficiencia_ea: String(areaEmEdicao.irrigacao.eficiencia_ea),
      vazao_ip: String(areaEmEdicao.irrigacao.vazao_ip),
      pam: String(areaEmEdicao.irrigacao.pam),
    });
    setPolygonPoints(areaEmEdicao.poligono?.map(ponto => [ponto.lat, ponto.lng]) || []);
    const grupos = new Map<string, SetorForm>();
    areaEmEdicao.tensiometros.forEach((tensiometro, indice) => {
      const nomeSetor = tensiometro.setor || 'Setor 1';
      if (!grupos.has(nomeSetor)) grupos.set(nomeSetor, { id: `setor_edicao_${indice}`, nome: nomeSetor, tensiometros: [] });
      grupos.get(nomeSetor)!.tensiometros.push({
        id: tensiometro.id,
        prof_cm: tensiometro.prof_cm,
        camada_inicio_cm: tensiometro.camada_inicio_cm,
        camada_fim_cm: tensiometro.camada_fim_cm,
        tipo: tensiometro.tipo || (tensiometro.is_controle ? 'controle' : 'decisao'),
        tensao_critica: tensiometro.tensao_critica,
      });
    });
    if (grupos.size > 0) setSetores(Array.from(grupos.values()));
    setEdicaoCarregada(true);
  }, [areaEmEdicao, edicaoCarregada]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSetor = () => {
    setSetores([
      ...setores,
      { id: `setor_${Date.now()}`, nome: `Setor ${setores.length + 1}`, tensiometros: [novoTensiometro('_1')] }
    ]);
  };

  const handleUpdateSetorName = (setId: string, nome: string) => {
    setSetores(setores.map(s => s.id === setId ? { ...s, nome } : s));
  };

  const handleRemoveSetor = (setId: string) => {
    if (setores.length > 1) {
      setSetores(setores.filter(s => s.id !== setId));
    }
  };

  const handleAddTensiometro = (setId: string) => {
    setSetores(setores.map(s => {
      if (s.id === setId) {
        return { ...s, tensiometros: [...s.tensiometros, { ...novoTensiometro(`_${Math.random()}`), tipo: 'controle' }] };
      }
      return s;
    }));
  };

  const handleUpdateTensiometro = (setId: string, tId: string, alteracoes: Partial<SetorForm['tensiometros'][number]>) => {
    setSetores(setores.map(s => {
      if (s.id === setId) {
        return {
          ...s,
          tensiometros: s.tensiometros.map(t => t.id === tId ? { ...t, ...alteracoes } : t)
        };
      }
      return s;
    }));
  };

  const handleRemoveTensiometro = (setId: string, tId: string) => {
    setSetores(setores.map(s => {
      if (s.id === setId) {
        if (s.tensiometros.length > 1) {
          return { ...s, tensiometros: s.tensiometros.filter(t => t.id !== tId) };
        }
      }
      return s;
    }));
  };

  const handleFinish = () => {
    const novaArea: Area = {
      id: areaEmEdicao?.id || `area_${Date.now()}`,
      agronomo_id: areaEmEdicao?.agronomo_id || currentUser!.id,
      produtor_id: formData.produtor_id,
      nome: formData.nome,
      poligono: polygonPoints.map(p => ({ lat: p[0], lng: p[1] })),
      solo: {
        coef_a: parseFloat(formData.coef_a) || 0,
        coef_b: parseFloat(formData.coef_b) || 0,
        umidade_cc: parseFloat(formData.umidade_cc) || 0
      },
      planta: {
        prof_raiz_mm: parseFloat(formData.prof_raiz_mm) || 0
      },
      irrigacao: {
        eficiencia_ea: parseFloat(formData.eficiencia_ea) || 0,
        vazao_ip: parseFloat(formData.vazao_ip) || 0,
        pam: parseFloat(formData.pam) || 0
      },
      tensiometros: setores.flatMap(s => s.tensiometros.map(t => ({
        id: t.id,
        prof_cm: t.prof_cm,
        setor: s.nome,
        camada_inicio_cm: t.camada_inicio_cm,
        camada_fim_cm: t.camada_fim_cm,
        tipo: t.tipo,
        is_controle: t.tipo === 'controle',
        tensao_critica: t.tensao_critica
      })))
    };

    const problemasGerais = [
      ...(!novaArea.nome.trim() ? ['Informe o nome da área.'] : []),
      ...(!novaArea.produtor_id ? ['Selecione o produtor vinculado.'] : []),
      ...validarParametrosIrrigacao(novaArea),
    ];
    if (problemasGerais.length > 0) {
      setFormError(problemasGerais);
      return;
    }

    if (areaEmEdicao) updateArea(novaArea);
    else addArea(novaArea);
    navigate('/agronomo/dashboard');
  };

  const aplicarCultura = (nome: string) => {
    const cult = SUGESTOES_CULTURA.find(c => c.nome === nome);
    if (cult) {
      setFormData(prev => ({ ...prev, prof_raiz_mm: String(cult.prof_raiz_mm) }));
      setCulturaSugerida(nome);
    }
  };

  const inputClass = "w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
          <ArrowLeft size={24} className="text-slate-700" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{areaEmEdicao ? 'Revisar Parâmetros da Área' : 'Cadastrar Nova Área'}</h1>
          <p className="text-slate-500">Configuração dos parâmetros de irrigação e mapeamento</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 overflow-x-auto">
        <div className="flex items-center justify-between mb-2 min-w-[500px]">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 
                ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                {step > i + 1 ? <Check size={16} /> : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-1 -translate-y-1/2 
                  ${step > i + 1 ? 'bg-green-500' : 'bg-slate-100'}`}></div>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-bold text-slate-500 mt-2">Passo {step} de {totalSteps}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {formError.length > 0 && (
          <div className="m-6 mb-0 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold mb-2">Revise os parâmetros antes de salvar:</p>
            <ul className="list-disc pl-5 space-y-1">
              {formError.map(problema => <li key={problema}>{problema}</li>)}
            </ul>
          </div>
        )}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Dados Gerais</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Área/Talhão *</label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Talhão 1 — Soja Safra Verão" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Produtor Vinculado *</label>
                  <select name="produtor_id" value={formData.produtor_id} onChange={handleChange} className={`${inputClass} bg-white`}>
                    <option value="">Selecione o Produtor</option>
                    {produtores.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cultura</label>
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <select value={culturaSugerida} onChange={(e) => aplicarCultura(e.target.value)} className={`${inputClass} bg-white`}>
                        <option value="">Selecione para sugerir valores (opcional)</option>
                        {SUGESTOES_CULTURA.map(c => (
                          <option key={c.nome} value={c.nome}>{c.nome} — {c.prof_raiz_mm}mm de raiz</option>
                        ))}
                      </select>
                      {culturaSugerida && (
                        <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center">
                          <Sparkles size={12} className="mr-1" />
                          Profundidade da raiz preenchida com {culturaSugerida}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xl font-bold text-slate-800">Desenhar Área no Mapa</h2>
                <button
                  onClick={() => setPolygonPoints([])}
                  className="text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  Limpar Desenho
                </button>
              </div>
              <p className="text-slate-500 text-sm">
                Clique no mapa para criar os vértices da área de plantio.
                {selectedProdutor?.localizacao_sede ? ' O mapa está centralizado na sede do produtor selecionado.' : ''}
              </p>

              <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-300 relative z-0">
                <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="h-full w-full">
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Mapa Padrão">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satélite (Híbrido)">
                      <TileLayer
                        attribution='&copy; <a href="https://server.arcgisonline.com">Esri</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>
                  {selectedProdutor?.localizacao_sede && (
                    <Marker position={[selectedProdutor.localizacao_sede.lat, selectedProdutor.localizacao_sede.lng]}>
                      <Popup>Sede: {selectedProdutor.nome}</Popup>
                    </Marker>
                  )}
                  <PolygonDrawer points={polygonPoints} setPoints={setPolygonPoints} />
                </MapContainer>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Tipo de Solo</h2>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Use os valores do laudo físico-hídrico do solo.</p>
                <p className="mt-1">Os coeficientes A e B precisam ser ajustados para a curva θ = A × ψ⁻ᴮ, com ψ em kPa e θ em cm³/cm³. O sistema não usa valores genéricos por textura.</p>
              </div>
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Parâmetros do Solo e Planta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Coeficiente A (a)" tooltip="Constante ajustada em laboratório para a curva θ = A × ψ⁻ᴮ, usando ψ em kPa. Não use um valor genérico por textura." />
                  <input type="number" step="0.001" min="0.001" max="1.5" name="coef_a" value={formData.coef_a} onChange={handleChange} placeholder="Valor do laudo" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Coeficiente B (b)" tooltip="Expoente ajustado em laboratório para a curva de retenção. Deve usar a mesma unidade de pressão adotada no sistema: kPa." />
                  <input type="number" step="0.001" min="0.001" max="2" name="coef_b" value={formData.coef_b} onChange={handleChange} placeholder="Valor do laudo" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Umidade Capac. Campo (θcc)" tooltip="Umidade volumétrica na capacidade de campo (cm³/cm³). Valores típicos: 0.10–0.50." />
                  <input type="number" step="0.001" min="0.01" max="1" name="umidade_cc" value={formData.umidade_cc} onChange={handleChange} placeholder="Ex: 0.280" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Profundidade Raiz (Z) – mm" tooltip="Profundidade efetiva do sistema radicular da cultura, usada para calcular o volume de água disponível no solo e o tempo de irrigação." />
                  <input type="number" step="10" min="50" max="2000" name="prof_raiz_mm" value={formData.prof_raiz_mm} onChange={handleChange} placeholder="Ex: 400 (soja)" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Sistema de Irrigação</h2>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Informe valores medidos ou obtidos no projeto hidráulico.</p>
                <p className="mt-1">A intensidade deve estar em mm/h sobre a mesma área de referência usada pela lâmina. Vazão de emissor em L/h não pode ser usada diretamente.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel label="Eficiência (Ea)" tooltip="Fração da água aplicada que fica armazenada na zona radicular (0,00–1,00). Ex: 0,85 = 85%." />
                  <input type="number" step="0.01" min="0.01" max="1.00" name="eficiencia_ea" value={formData.eficiencia_ea} onChange={handleChange} placeholder="Ex: 0.85 (85%)" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Intensidade de Aplicação (Ip) – mm/h" tooltip="Lâmina média aplicada por hora sobre a área de referência. Para irrigação localizada, converta a vazão dos emissores usando seus espaçamentos." />
                  <input type="number" step="0.1" min="0.1" max="100" name="vazao_ip" value={formData.vazao_ip} onChange={handleChange} placeholder="Valor medido em mm/h" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="PAM – Porcentagem Área Molhada" tooltip="Porcentagem da área efetivamente molhada pelo sistema de irrigação (0,00–1,00). Ex: 0,40 = 40% para gotejamento, 1,00 = 100% para aspersão." />
                  <input type="number" step="0.05" min="0.05" max="1.00" name="pam" value={formData.pam} onChange={handleChange} placeholder="Ex: 0.70" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Critério de Monitoramento</h2>
              <p className="text-slate-500 text-sm">
                No próximo passo, informe individualmente a faixa de solo representada por cada tensiômetro. O cálculo será limitado à profundidade efetiva das raízes e fará a média de sensores que representam a mesma faixa.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-xs font-bold uppercase text-blue-600">Sensor de decisão</p>
                  <p className="text-sm text-slate-600 mt-2">Define quando a tensão crítica foi atingida.</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase text-slate-600">Sensor de controle</p>
                  <p className="text-sm text-slate-600 mt-2">Monitora as camadas mais profundas e a qualidade da aplicação.</p>
                </div>
                <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                  <p className="text-xs font-bold uppercase text-green-700">Zona radicular</p>
                  <p className="text-sm text-slate-600 mt-2">Limite atual: {formData.prof_raiz_mm || '--'} mm.</p>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-800">Tensiômetros</h2>
                  <Tooltip text="Cadastre a função e a faixa representativa de cada instrumento conforme o plano de monitoramento definido pelo agrônomo.">
                    <Info size={16} className="text-blue-500 cursor-help" />
                  </Tooltip>
                </div>
                <button onClick={handleAddSetor} className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-lg">
                  <Plus size={16} className="mr-1" /> Adicionar Setor
                </button>
              </div>

              <div className="space-y-6">
                {setores.map((setor, sIndex) => (
                  <div key={setor.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nome do Setor</label>
                        <input
                          type="text"
                          value={setor.nome}
                          onChange={(e) => handleUpdateSetorName(setor.id, e.target.value)}
                          className="w-full sm:w-64 p-2 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold"
                          placeholder="Ex: Setor 1"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAddTensiometro(setor.id)}
                          className="flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus size={14} className="mr-1" /> Tensiômetro
                        </button>
                        <button
                          onClick={() => handleRemoveSetor(setor.id)}
                          disabled={setores.length === 1}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                          title="Remover Setor"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {setor.tensiometros.map((t, tIndex) => (
                        <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-bold text-slate-700 text-sm">Tensiômetro {tIndex + 1}</span>
                            <button
                              onClick={() => handleRemoveTensiometro(setor.id, t.id)}
                              disabled={setor.tensiometros.length === 1}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                              title="Remover Tensiômetro"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Instalação (cm)</label>
                              <input
                                type="number"
                                value={t.prof_cm}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { prof_cm: parseFloat(e.target.value) || 0 })}
                                className={inputClass}
                                min={0}
                                max={200}
                                step={1}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Camada inicial (cm)</label>
                              <input
                                type="number"
                                value={t.camada_inicio_cm}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { camada_inicio_cm: parseFloat(e.target.value) || 0 })}
                                className={inputClass}
                                min={0}
                                max={200}
                                step={1}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Camada final (cm)</label>
                              <input
                                type="number"
                                value={t.camada_fim_cm}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { camada_fim_cm: parseFloat(e.target.value) || 0 })}
                                className={inputClass}
                                min={1}
                                max={200}
                                step={1}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Função</label>
                              <select
                                value={t.tipo}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { tipo: e.target.value as 'decisao' | 'controle' })}
                                className={`${inputClass} bg-white`}
                              >
                                <option value="decisao">Decisão</option>
                                <option value="controle">Controle</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tensão crítica (kPa)</label>
                              <input
                                type="number"
                                value={t.tensao_critica}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { tensao_critica: parseFloat(e.target.value) || 0 })}
                                className={inputClass}
                                min={0.1}
                                max={100}
                                step={0.1}
                                disabled={t.tipo === 'controle'}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 mt-3">
                            {t.tipo === 'decisao' ? 'Participa da média que dispara a irrigação.' : 'Não dispara a irrigação; participa do cálculo da umidade na camada monitorada.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="px-6 py-3 font-bold text-slate-600 disabled:opacity-0 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Voltar
          </button>

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
              Próximo Passo
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors flex items-center"
            >
              <Check size={20} className="mr-2" />
              {areaEmEdicao ? 'Salvar Alterações' : 'Finalizar Cadastro'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
