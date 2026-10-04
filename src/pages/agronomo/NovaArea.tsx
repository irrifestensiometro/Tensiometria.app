import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeft, Check, Plus, Trash2, MapPin, Info, Sparkles, Cloud, CloudOff, Undo2 } from 'lucide-react';
import { Area, AreaDraft } from '../../types';
import { validarParametrosIrrigacao } from '../../lib/irrigationMath';
import { formatarNumeroLocalizado, parseNumeroLocalizado } from '../../lib/numberFormat';
import { MapContainer, Polygon, Marker, Popup } from 'react-leaflet';
import { initLeafletIcons } from '../../lib/leaflet-setup';
import { PolygonDrawer } from '../../components/map/MapUtils';
import { HybridSatelliteTiles } from '../../components/map/HybridSatelliteTiles';
import { Tooltip } from '../../components/ui/Tooltip';
import { FieldLabel } from '../../components/ui/FieldLabel';
import { formatarCpf } from '../../lib/cpf';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, areas, areaDrafts, produtores, loading, addArea, updateArea, saveAreaDraftLocally, saveAreaDraft, removeAreaDraft } = useAppContext();
  const areaEmEdicao = areaId ? areas.find(area => area.id === areaId) : undefined;
  const [draftId] = useState(() => searchParams.get('rascunho') || crypto.randomUUID());
  const draftCompleted = useRef(false);

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
  const [culturaSugerida, setCulturaSugerida] = useState('');
  const [formError, setFormError] = useState<string[]>([]);
  const [edicaoCarregada, setEdicaoCarregada] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<'saving' | 'saved' | 'local' | 'error'>('saving');
  const [draftSaveError, setDraftSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const produtorSelecionado = produtores.find((produtor) => produtor.id === formData.produtor_id);
  const localizacaoProdutor = produtorSelecionado?.localizacao_sede
    ? [produtorSelecionado.localizacao_sede.lat, produtorSelecionado.localizacao_sede.lng] as [number, number]
    : null;
  const centroAreaExistente = areaEmEdicao?.poligono?.length
    ? [
        areaEmEdicao.poligono.reduce((soma, ponto) => soma + ponto.lat, 0) / areaEmEdicao.poligono.length,
        areaEmEdicao.poligono.reduce((soma, ponto) => soma + ponto.lng, 0) / areaEmEdicao.poligono.length,
      ] as [number, number]
    : null;
  const mapCenter: [number, number] = centroAreaExistente
    || localizacaoProdutor
    || [-20.3155, -40.3128];

  type SetorForm = {
    id: string;
    nome: string;
    tensiometros: {
      id: string;
      prof_cm: string;
      camada_inicio_cm: string;
      camada_fim_cm: string;
      tipo: 'decisao' | 'controle';
      tensao_critica: string;
    }[];
  };

  const novoTensiometro = (sufixo = '') => ({
    id: `t_${Date.now()}${sufixo}`,
    prof_cm: '15',
    camada_inicio_cm: '0',
    camada_fim_cm: '30',
    tipo: 'decisao' as const,
    tensao_critica: '40',
  });

  const [setores, setSetores] = useState<SetorForm[]>([
    { id: 'setor_1', nome: 'Setor 1', tensiometros: [novoTensiometro()] }
  ]);

  const handleNumericBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData((current) => ({ ...current, [name]: formatarNumeroLocalizado(value) }));
  };

  useEffect(() => {
    if (!areaEmEdicao || edicaoCarregada) return;
    setFormData({
      nome: areaEmEdicao.nome,
      produtor_id: areaEmEdicao.produtor_id,
      coef_a: formatarNumeroLocalizado(String(areaEmEdicao.solo.coef_a)),
      coef_b: formatarNumeroLocalizado(String(areaEmEdicao.solo.coef_b)),
      umidade_cc: formatarNumeroLocalizado(String(areaEmEdicao.solo.umidade_cc)),
      prof_raiz_mm: formatarNumeroLocalizado(String(areaEmEdicao.planta.prof_raiz_mm)),
      eficiencia_ea: formatarNumeroLocalizado(String(areaEmEdicao.irrigacao.eficiencia_ea)),
      vazao_ip: formatarNumeroLocalizado(String(areaEmEdicao.irrigacao.vazao_ip)),
      pam: formatarNumeroLocalizado(String(areaEmEdicao.irrigacao.pam)),
    });
    setPolygonPoints(areaEmEdicao.poligono?.map(ponto => [ponto.lat, ponto.lng]) || []);
    const grupos = new Map<string, SetorForm>();
    areaEmEdicao.tensiometros.forEach((tensiometro, indice) => {
      const nomeSetor = tensiometro.setor || 'Setor 1';
      if (!grupos.has(nomeSetor)) grupos.set(nomeSetor, { id: `setor_edicao_${indice}`, nome: nomeSetor, tensiometros: [] });
      grupos.get(nomeSetor)!.tensiometros.push({
        id: tensiometro.id,
        prof_cm: String(tensiometro.prof_cm),
        camada_inicio_cm: String(tensiometro.camada_inicio_cm),
        camada_fim_cm: String(tensiometro.camada_fim_cm),
        tipo: tensiometro.tipo || (tensiometro.is_controle ? 'controle' : 'decisao'),
        tensao_critica: String(tensiometro.tensao_critica),
      });
    });
    if (grupos.size > 0) setSetores(Array.from(grupos.values()));
    setEdicaoCarregada(true);
  }, [areaEmEdicao, edicaoCarregada]);

  useEffect(() => {
    if (loading || draftReady || (areaId && !edicaoCarregada)) return;
    const savedDraft = areaDrafts.find((draft) => draft.id === draftId);
    if (savedDraft) {
      setStep(savedDraft.step);
      setFormData(savedDraft.formData);
      setPolygonPoints(savedDraft.polygonPoints);
      setCulturaSugerida(savedDraft.culturaSugerida);
      setSetores(savedDraft.setores);
    } else if (searchParams.has('rascunho')) {
      setDraftSaveError('Este rascunho não foi encontrado na nuvem nem neste dispositivo. Você pode continuar criando a área.');
      setDraftSaveStatus('error');
    }
    if (!searchParams.has('rascunho')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('rascunho', draftId);
      setSearchParams(nextParams, { replace: true });
    }
    setDraftReady(true);
  }, [loading, draftReady, areaId, edicaoCarregada, areaDrafts, draftId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!draftReady || !currentUser) return;
    const timeout = window.setTimeout(() => {
      setDraftSaveStatus('saving');
      setDraftSaveError('');
      void saveAreaDraft(criarRascunhoFormulario())
        .then(() => setDraftSaveStatus('saved'))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : '';
          const savedLocally = message.startsWith('O rascunho foi salvo neste dispositivo');
          setDraftSaveStatus(savedLocally ? 'local' : 'error');
          setDraftSaveError(
            savedLocally
              ? message
              : `Não foi possível salvar o rascunho: ${message || 'erro desconhecido.'}`,
          );
        });
    }, 700);
    return () => {
      window.clearTimeout(timeout);
      if (draftCompleted.current) return;
      try {
        saveAreaDraftLocally(criarRascunhoFormulario());
      } catch (error) {
        setDraftSaveStatus('error');
        setDraftSaveError(
          `Não foi possível salvar o rascunho neste dispositivo: ${error instanceof Error ? error.message : 'erro desconhecido.'}`,
        );
      }
    };
  }, [draftReady, currentUser, draftId, areaId, step, formData, polygonPoints, culturaSugerida, setores, saveAreaDraft, saveAreaDraftLocally]);

  useEffect(() => {
    if (!draftReady || !currentUser) return;
    const saveBeforeUnload = () => {
      saveAreaDraftLocally(criarRascunhoFormulario());
    };
    window.addEventListener('beforeunload', saveBeforeUnload);
    return () => window.removeEventListener('beforeunload', saveBeforeUnload);
  }, [draftReady, currentUser, draftId, areaId, step, formData, polygonPoints, culturaSugerida, setores, saveAreaDraftLocally]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormError([]);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePolygonPointsChange: React.Dispatch<React.SetStateAction<[number, number][]>> = (points) => {
    setFormError([]);
    setPolygonPoints(points);
  };

  const criarRascunhoArea = (): Area => ({
    id: areaEmEdicao?.id || draftId,
    agronomo_id: areaEmEdicao?.agronomo_id || currentUser!.id,
    produtor_id: formData.produtor_id,
    nome: formData.nome,
    ...(polygonPoints.length >= 3
      ? { poligono: polygonPoints.map(([lat, lng]) => ({ lat, lng })) }
      : {}),
    solo: {
      coef_a: parseNumeroLocalizado(formData.coef_a),
      coef_b: parseNumeroLocalizado(formData.coef_b),
      umidade_cc: parseNumeroLocalizado(formData.umidade_cc),
    },
    planta: {
      prof_raiz_mm: parseNumeroLocalizado(formData.prof_raiz_mm),
    },
    irrigacao: {
      eficiencia_ea: parseNumeroLocalizado(formData.eficiencia_ea),
      vazao_ip: parseNumeroLocalizado(formData.vazao_ip),
      pam: parseNumeroLocalizado(formData.pam),
    },
    tensiometros: setores.flatMap((setor) => setor.tensiometros.map((sensor) => ({
      id: sensor.id,
      prof_cm: parseNumeroLocalizado(sensor.prof_cm),
      setor: setor.nome,
      camada_inicio_cm: parseNumeroLocalizado(sensor.camada_inicio_cm),
      camada_fim_cm: parseNumeroLocalizado(sensor.camada_fim_cm),
      tipo: sensor.tipo,
      is_controle: sensor.tipo === 'controle',
      tensao_critica: parseNumeroLocalizado(sensor.tensao_critica),
    }))),
  });

  const criarRascunhoFormulario = (): AreaDraft => ({
    id: draftId,
    agronomo_id: currentUser!.id,
    ...(areaId ? { area_id: areaId } : {}),
    step,
    formData,
    polygonPoints,
    culturaSugerida,
    setores,
    updated_at: Date.now(),
  });

  const validarEtapaAtual = () => {
    if (step === 1) {
      return [
        ...(!formData.nome.trim() ? ['Informe o nome da área.'] : []),
        ...(!formData.produtor_id ? ['Selecione o produtor vinculado.'] : []),
      ];
    }

    return [];
  };

  const obterAvisosEtapaAtual = () => {
    if (step === 2) {
      return polygonPoints.length > 0 && polygonPoints.length < 3
        ? ['O desenho tem menos de 3 pontos e não será salvo como limite da área. Você pode continuar sem o polígono.']
        : [];
    }

    if (step === 3) {
      const problems: string[] = [];
      const values = [
        ['Coeficiente A', formData.coef_a, 0.001, 1.5],
        ['Coeficiente B', formData.coef_b, 0.001, 2],
        ['Umidade na capacidade de campo', formData.umidade_cc, 0.01, 1],
        ['Profundidade radicular', formData.prof_raiz_mm, 50, 2000],
      ] as const;

      for (const [label, rawValue, minimum, maximum] of values) {
        const value = parseNumeroLocalizado(rawValue);
        if (!rawValue.trim() || !Number.isFinite(value) || value < minimum || value > maximum) {
          problems.push(`${label}: valor ausente ou fora do intervalo recomendado (${minimum} a ${maximum}).`);
        }
      }
      return problems;
    }

    if (step === 4) {
      const problems: string[] = [];
      const values = [
        ['Eficiência de aplicação', formData.eficiencia_ea, 0.01, 1],
        ['Intensidade de aplicação', formData.vazao_ip, 0.1, 100],
        ['PAM', formData.pam, 0.05, 1],
      ] as const;

      for (const [label, rawValue, minimum, maximum] of values) {
        const value = parseNumeroLocalizado(rawValue);
        if (!rawValue.trim() || !Number.isFinite(value) || value < minimum || value > maximum) {
          problems.push(`${label}: valor ausente ou fora do intervalo recomendado (${minimum} a ${maximum}).`);
        }
      }
      return problems;
    }

    if (step === 6) {
      const nomesSetores = new Set<string>();
      const problemasNomes = setores.flatMap((setor) => {
        const nome = setor.nome.trim();
        const normalizado = nome.toLocaleLowerCase('pt-BR');
        if (!nome) return ['Há um setor sem nome.'];
        if (nomesSetores.has(normalizado)) return [`O nome do setor "${nome}" está repetido.`];
        nomesSetores.add(normalizado);
        return [];
      });
      const problemasSensores = validarParametrosIrrigacao(criarRascunhoArea()).filter((problem) =>
        /tensiômetro|tensiometro|camadas monitoradas|zona radicular/i.test(problem),
      );
      return [...problemasNomes, ...problemasSensores];
    }

    return [];
  };

  const avisosEtapaAtual = obterAvisosEtapaAtual();

  const handleNextStep = () => {
    const problems = validarEtapaAtual();
    setFormError(problems);
    if (problems.length === 0) setStep((currentStep) => currentStep + 1);
  };

  const handleAddSetor = () => {
    setFormError([]);
    setSetores([
      ...setores,
      { id: `setor_${Date.now()}`, nome: `Setor ${setores.length + 1}`, tensiometros: [novoTensiometro('_1')] }
    ]);
  };

  const handleUpdateSetorName = (setId: string, nome: string) => {
    setFormError([]);
    setSetores(setores.map(s => s.id === setId ? { ...s, nome } : s));
  };

  const handleRemoveSetor = (setId: string) => {
    setFormError([]);
    if (setores.length > 1) {
      setSetores(setores.filter(s => s.id !== setId));
    }
  };

  const handleAddTensiometro = (setId: string) => {
    setFormError([]);
    setSetores(setores.map(s => {
      if (s.id === setId) {
        return { ...s, tensiometros: [...s.tensiometros, novoTensiometro(`_${Math.random()}`)] };
      }
      return s;
    }));
  };

  const handleUpdateTensiometro = (setId: string, tId: string, alteracoes: Partial<SetorForm['tensiometros'][number]>) => {
    setFormError([]);
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

  const handleBlurTensiometro = (
    setId: string,
    tId: string,
    campo: 'prof_cm' | 'camada_inicio_cm' | 'camada_fim_cm' | 'tensao_critica',
    valor: string,
  ) => {
    handleUpdateTensiometro(setId, tId, { [campo]: formatarNumeroLocalizado(valor) });
  };

  const handleRemoveTensiometro = (setId: string, tId: string) => {
    setFormError([]);
    setSetores(setores.map(s => {
      if (s.id === setId) {
        if (s.tensiometros.length > 1) {
          return { ...s, tensiometros: s.tensiometros.filter(t => t.id !== tId) };
        }
      }
      return s;
    }));
  };

  const handleFinish = async () => {
    const problemasEtapa = validarEtapaAtual();
    setFormError(problemasEtapa);
    if (problemasEtapa.length > 0) {
      return;
    }

    const novaArea = criarRascunhoArea();
    setSaving(true);
    let areaPublicada = false;
    try {
      try {
        await saveAreaDraft(criarRascunhoFormulario());
      } catch (draftError) {
        const message = draftError instanceof Error ? draftError.message : 'erro desconhecido.';
        const savedLocally = message.startsWith('O rascunho foi salvo neste dispositivo');
        setDraftSaveStatus(savedLocally ? 'local' : 'error');
        setDraftSaveError(`${message} Tentando concluir a publicação da área.`);
      }
      if (areaEmEdicao) await updateArea(novaArea);
      else await addArea(novaArea);
      areaPublicada = true;
      await removeAreaDraft(draftId);
      draftCompleted.current = true;
      navigate('/agronomo/dashboard');
    } catch (error) {
      setFormError([
        areaPublicada
          ? `A área foi publicada, mas não foi possível remover o rascunho: ${error instanceof Error ? error.message : 'erro desconhecido.'}`
          : `Não foi possível salvar a área: ${error instanceof Error ? error.message : 'erro desconhecido.'}`,
      ]);
    } finally {
      setSaving(false);
    }
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
        {draftReady && (
          <div className={`ml-auto flex items-center gap-2 text-xs font-semibold ${
            draftSaveStatus === 'saved' ? 'text-green-700' : draftSaveStatus === 'saving' ? 'text-slate-500' : 'text-amber-800'
          }`}>
            {draftSaveStatus === 'error' ? <CloudOff size={16} /> : <Cloud size={16} />}
            <span>
              {draftSaveStatus === 'saved' ? 'Rascunho salvo' :
                draftSaveStatus === 'saving' ? 'Salvando rascunho…' :
                  draftSaveStatus === 'local' ? 'Salvo neste dispositivo' : 'Falha ao salvar rascunho'}
            </span>
          </div>
        )}
      </div>

      {draftSaveError && (
        <div role="status" className={`rounded-xl border p-4 text-sm ${
          draftSaveStatus === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}>
          {draftSaveError}
        </div>
      )}

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
            <p className="font-bold mb-2">Corrija esta etapa antes de continuar:</p>
            <ul className="list-disc pl-5 space-y-1">
              {formError.map(problema => <li key={problema}>{problema}</li>)}
            </ul>
          </div>
        )}
        {avisosEtapaAtual.length > 0 && (
          <div className="m-6 mb-0 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
            <p className="font-bold mb-2">Atenção: revise estes dados quando possível. Você pode continuar e salvar a área.</p>
            <ul className="list-disc pl-5 space-y-1">
              {avisosEtapaAtual.map((aviso) => <li key={aviso}>{aviso}</li>)}
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
                  <select
                    name="produtor_id"
                    value={formData.produtor_id}
                    onChange={handleChange}
                    className={`${inputClass} bg-white`}
                    required
                  >
                    <option value="">Selecione o produtor</option>
                    {areaEmEdicao
                      && !produtores.some((produtor) => produtor.id === areaEmEdicao.produtor_id) && (
                        <option value={areaEmEdicao.produtor_id}>
                          Produtor já vinculado ({areaEmEdicao.produtor_id})
                        </option>
                      )}
                    {produtores.map((produtor) => (
                      <option key={produtor.id} value={produtor.id}>
                        {produtor.cpf
                          ? `${produtor.nome} — CPF ${formatarCpf(produtor.cpf)}`
                          : produtor.nome}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {produtores.length > 0
                      ? 'A lista contém produtores cadastrados no sistema.'
                      : 'Nenhum produtor aparece na lista. Peça ao produtor para entrar novamente ou sincronize os perfis existentes pelo comando administrativo.'}
                  </p>
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <h2 className="text-xl font-bold text-slate-800">Localização da Área (opcional)</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPolygonPoints(points => points.slice(0, -1))}
                    disabled={polygonPoints.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Undo2 size={16} />
                    Desfazer ponto
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolygonPoints([])}
                    disabled={polygonPoints.length === 0}
                    className="text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Limpar Desenho
                  </button>
                </div>
              </div>
              <p className="text-slate-500 text-sm">
                {localizacaoProdutor
                  ? `O mapa está centralizado na sede de ${produtorSelecionado?.nome}. Desenhar os limites da área é opcional; clique no mapa para marcar os vértices ou avance sem desenhar.`
                  : 'Desenhar os limites da área é opcional. Clique no mapa para marcar os vértices ou avance sem desenhar; a posição exibida é apenas uma referência.'}
              </p>

              <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-300 relative z-0">
                <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="h-full w-full">
                  <HybridSatelliteTiles />
                  {localizacaoProdutor && (
                    <Marker position={localizacaoProdutor}>
                      <Popup>Sede de {produtorSelecionado?.nome}</Popup>
                    </Marker>
                  )}
                  <PolygonDrawer points={polygonPoints} setPoints={handlePolygonPointsChange} />
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
                  <input type="text" inputMode="decimal" name="coef_a" value={formData.coef_a} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Valor do laudo" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Coeficiente B (b)" tooltip="Expoente ajustado em laboratório para a curva de retenção. Deve usar a mesma unidade de pressão adotada no sistema: kPa." />
                  <input type="text" inputMode="decimal" name="coef_b" value={formData.coef_b} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Valor do laudo" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Umidade Capac. Campo (θcc)" tooltip="Umidade volumétrica na capacidade de campo (cm³/cm³). Valores típicos: 0.10–0.50." />
                  <input type="text" inputMode="decimal" name="umidade_cc" value={formData.umidade_cc} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Ex: 0,280" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Profundidade Raiz (Z) – mm" tooltip="Profundidade efetiva do sistema radicular da cultura, usada para calcular o volume de água disponível no solo e o tempo de irrigação." />
                  <input type="text" inputMode="decimal" name="prof_raiz_mm" value={formData.prof_raiz_mm} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Ex: 400 (soja)" className={inputClass} />
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
                  <input type="text" inputMode="decimal" name="eficiencia_ea" value={formData.eficiencia_ea} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Ex: 0,85 (85%)" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Intensidade de Aplicação (Ip) – mm/h" tooltip="Lâmina média aplicada por hora sobre a área de referência. Para irrigação localizada, converta a vazão dos emissores usando seus espaçamentos." />
                  <input type="text" inputMode="decimal" name="vazao_ip" value={formData.vazao_ip} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Valor medido em mm/h" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="PAM – Porcentagem Área Molhada" tooltip="Porcentagem da área efetivamente molhada pelo sistema de irrigação (0,00–1,00). Ex: 0,40 = 40% para gotejamento, 1,00 = 100% para aspersão." />
                  <input type="text" inputMode="decimal" name="pam" value={formData.pam} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Ex: 0,70" className={inputClass} />
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
                                type="text"
                                inputMode="decimal"
                                value={t.prof_cm}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { prof_cm: e.target.value })}
                                onBlur={(e) => handleBlurTensiometro(setor.id, t.id, 'prof_cm', e.currentTarget.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Camada inicial (cm)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={t.camada_inicio_cm}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { camada_inicio_cm: e.target.value })}
                                onBlur={(e) => handleBlurTensiometro(setor.id, t.id, 'camada_inicio_cm', e.currentTarget.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Camada final (cm)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={t.camada_fim_cm}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { camada_fim_cm: e.target.value })}
                                onBlur={(e) => handleBlurTensiometro(setor.id, t.id, 'camada_fim_cm', e.currentTarget.value)}
                                className={inputClass}
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
                                type="text"
                                inputMode="decimal"
                                value={t.tensao_critica}
                                onChange={(e) => handleUpdateTensiometro(setor.id, t.id, { tensao_critica: e.target.value })}
                                onBlur={(e) => handleBlurTensiometro(setor.id, t.id, 'tensao_critica', e.currentTarget.value)}
                                className={inputClass}
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
              onClick={handleNextStep}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
              Próximo Passo
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors flex items-center"
            >
              <Check size={20} className="mr-2" />
              {saving ? 'Salvando...' : areaEmEdicao ? 'Salvar Alterações' : 'Finalizar Cadastro'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
