import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeft, Check, Plus, Trash2, MapPin, Info, Sparkles } from 'lucide-react';
import { Area, Tensiometro, Produtor } from '../../types';
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

const SUGESTOES_SOLO = [
  { nome: 'Franco', coef_a: 0.020, coef_b: 0.015, umidade_cc: 0.30 },
  { nome: 'Argiloso', coef_a: 0.035, coef_b: 0.025, umidade_cc: 0.40 },
  { nome: 'Arenoso', coef_a: 0.010, coef_b: 0.008, umidade_cc: 0.15 },
  { nome: 'Siltoso', coef_a: 0.025, coef_b: 0.020, umidade_cc: 0.35 },
  { nome: 'Franco-argiloso', coef_a: 0.028, coef_b: 0.020, umidade_cc: 0.35 },
  { nome: 'Franco-arenoso', coef_a: 0.015, coef_b: 0.012, umidade_cc: 0.22 },
];

const SUGESTOES_IRRIGACAO = [
  { nome: 'Gotejamento', eficiencia_ea: 0.90, vazao_ip: 2.0, pam: 0.40 },
  { nome: 'Microaspersão', eficiencia_ea: 0.85, vazao_ip: 4.0, pam: 0.60 },
  { nome: 'Irrigação Localizada', eficiencia_ea: 0.90, vazao_ip: 3.0, pam: 0.50 },
  { nome: 'Pivô Central', eficiencia_ea: 0.85, vazao_ip: 8.0, pam: 1.0 },
  { nome: 'Aspersão', eficiencia_ea: 0.75, vazao_ip: 12.0, pam: 1.0 },
  { nome: 'Sulco', eficiencia_ea: 0.60, vazao_ip: 15.0, pam: 1.0 },
];

export default function NovaArea() {
  const navigate = useNavigate();
  const { produtores, currentUser, addArea } = useAppContext();

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
  const [tipoSoloSugerido, setTipoSoloSugerido] = useState('');
  const [sistemaIrrigacaoSugerido, setSistemaIrrigacaoSugerido] = useState('');

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
    tensiometros: { id: string; prof_cm: number }[];
  };

  const [setores, setSetores] = useState<SetorForm[]>([
    { id: 'setor_1', nome: 'Setor 1', tensiometros: [{ id: `t_${Date.now()}`, prof_cm: 20 }] }
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSetor = () => {
    setSetores([
      ...setores,
      { id: `setor_${Date.now()}`, nome: `Setor ${setores.length + 1}`, tensiometros: [{ id: `t_${Date.now()}_1`, prof_cm: 20 }] }
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
        return { ...s, tensiometros: [...s.tensiometros, { id: `t_${Date.now()}_${Math.random()}`, prof_cm: 20 }] };
      }
      return s;
    }));
  };

  const handleUpdateTensiometro = (setId: string, tId: string, prof_cm: number) => {
    setSetores(setores.map(s => {
      if (s.id === setId) {
        return {
          ...s,
          tensiometros: s.tensiometros.map(t => t.id === tId ? { ...t, prof_cm } : t)
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
      id: `area_${Date.now()}`,
      agronomo_id: currentUser!.id,
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
        camada_inicio_cm: Math.max(0, t.prof_cm - 10),
        camada_fim_cm: t.prof_cm + 10,
        is_controle: false,
        tensao_critica: 40
      })))
    };

    addArea(novaArea);
    navigate('/agronomo/dashboard');
  };

  const aplicarCultura = (nome: string) => {
    const cult = SUGESTOES_CULTURA.find(c => c.nome === nome);
    if (cult) {
      setFormData(prev => ({ ...prev, prof_raiz_mm: String(cult.prof_raiz_mm) }));
      setCulturaSugerida(nome);
    }
  };

  const aplicarSolo = (nome: string) => {
    const solo = SUGESTOES_SOLO.find(s => s.nome === nome);
    if (solo) {
      setFormData(prev => ({
        ...prev,
        coef_a: String(solo.coef_a),
        coef_b: String(solo.coef_b),
        umidade_cc: String(solo.umidade_cc),
      }));
      setTipoSoloSugerido(nome);
    }
  };

  const aplicarIrrigacao = (nome: string) => {
    const sist = SUGESTOES_IRRIGACAO.find(s => s.nome === nome);
    if (sist) {
      setFormData(prev => ({
        ...prev,
        eficiencia_ea: String(sist.eficiencia_ea),
        vazao_ip: String(sist.vazao_ip),
        pam: String(sist.pam),
      }));
      setSistemaIrrigacaoSugerido(nome);
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
          <h1 className="text-3xl font-bold text-slate-800">Cadastrar Nova Área</h1>
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Sugestão por Tipo de Solo</label>
                <select value={tipoSoloSugerido} onChange={(e) => aplicarSolo(e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Selecione o tipo de solo (preenche automaticamente)</option>
                  {SUGESTOES_SOLO.map(s => (
                    <option key={s.nome} value={s.nome}>
                      {s.nome} — a={s.coef_a} b={s.coef_b} θcc={s.umidade_cc}
                    </option>
                  ))}
                </select>
                {tipoSoloSugerido && (
                  <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center">
                    <Sparkles size={12} className="mr-1" />
                    Parâmetros preenchidos para solo {tipoSoloSugerido}
                  </p>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Parâmetros do Solo e Planta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Coeficiente A (a)" tooltip="Constante de calibração 'a' específica do solo, usada na equação característica da curva de retenção de água. Valores típicos: 0.008–0.040." />
                  <input type="number" step="0.001" min="0.001" max="0.100" name="coef_a" value={formData.coef_a} onChange={handleChange} placeholder="Ex: 0.020 (franco)" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Coeficiente B (b)" tooltip="Constante de calibração 'b' específica do solo. Valores típicos: 0.005–0.030." />
                  <input type="number" step="0.001" min="0.001" max="0.050" name="coef_b" value={formData.coef_b} onChange={handleChange} placeholder="Ex: 0.015 (franco)" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Umidade Capac. Campo (θcc)" tooltip="Umidade volumétrica na capacidade de campo (cm³/cm³). Valores típicos: 0.10–0.50." />
                  <input type="number" step="0.01" min="0.01" max="0.60" name="umidade_cc" value={formData.umidade_cc} onChange={handleChange} placeholder="Ex: 0.30 (franco)" className={inputClass} />
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Sugestão por Sistema</label>
                <select value={sistemaIrrigacaoSugerido} onChange={(e) => aplicarIrrigacao(e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Selecione o sistema (preenche automaticamente)</option>
                  {SUGESTOES_IRRIGACAO.map(s => (
                    <option key={s.nome} value={s.nome}>
                      {s.nome} — Ea={s.eficiencia_ea} Ip={s.vazao_ip}mm/h PAM={s.pam}
                    </option>
                  ))}
                </select>
                {sistemaIrrigacaoSugerido && (
                  <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center">
                    <Sparkles size={12} className="mr-1" />
                    Parâmetros preenchidos para {sistemaIrrigacaoSugerido}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel label="Eficiência (Ea)" tooltip="Fração da água aplicada que fica armazenada na zona radicular (0,00–1,00). Ex: 0,85 = 85%." />
                  <input type="number" step="0.01" min="0.01" max="1.00" name="eficiencia_ea" value={formData.eficiencia_ea} onChange={handleChange} placeholder="Ex: 0.85 (85%)" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Vazão / Precipitação (Ip) – mm/h" tooltip="Lâmina de água aplicada por hora pelo sistema. Varia de 1 mm/h (gotejamento) a 20 mm/h (aspersão)." />
                  <input type="number" step="0.5" min="0.5" max="50" name="vazao_ip" value={formData.vazao_ip} onChange={handleChange} placeholder="Ex: 8.0 (pivô)" className={inputClass} />
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
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Profundidade de Controle</h2>
              <p className="text-slate-500 text-sm">
                Defina a profundidade de controle para análise de umidade do solo. Profundidade típica: 20–40 cm da superfície.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Profundidade Mínima (cm)" tooltip="Profundidade mínima de interesse para análise de umidade. Normalmente 0–10 cm." />
                  <input type="number" step="1" min="0" max="200" placeholder="Ex: 0" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Profundidade Máxima (cm)" tooltip="Profundidade máxima que a cultura extrai água. Deve coincidir com a profundidade efetiva das raízes." />
                  <input type="number" step="1" min="0" max="200" placeholder="Ex: 60" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-800">Tensiômetros</h2>
                  <Tooltip text="Adicione os tensiômetros agrupados por setores da área. A profundidade sugerida é 20 cm para captar a zona radicular ativa.">
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
                        <div key={t.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="font-bold text-slate-400 w-6 text-sm">{tIndex + 1}.</span>
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Profundidade (cm)</label>
                            <input
                              type="number"
                              value={t.prof_cm || ''}
                              onChange={(e) => handleUpdateTensiometro(setor.id, t.id, parseInt(e.target.value) || 0)}
                              className="w-full sm:w-32 p-1.5 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                              placeholder="Ex: 20"
                              min={0}
                              max={200}
                              step={5}
                            />
                          </div>
                          <div className="text-xs text-slate-400 w-24 leading-tight">
                            Sugerido: 20 cm
                          </div>
                          <button
                            onClick={() => handleRemoveTensiometro(setor.id, t.id)}
                            disabled={setor.tensiometros.length === 1}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                            title="Remover Tensiômetro"
                          >
                            <Trash2 size={16} />
                          </button>
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
              Finalizar Cadastro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}