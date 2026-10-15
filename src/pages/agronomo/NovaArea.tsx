import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeft, Check, Plus, Trash2, MapPin, Info, Sparkles, Cloud, CloudOff, Undo2, Search } from 'lucide-react';
import { Area, AreaDraft } from '../../types';
import { validarParametrosIrrigacao } from '../../lib/irrigationMath';
import { formatarNumeroLocalizado, parseNumeroLocalizado } from '../../lib/numberFormat';
import { listarCulturasMaisUsadas } from '../../lib/cultureRecommendations';
import { temDadosMinimosParaRascunho } from '../../lib/areaDraftValidation';
import {
  converterUmidadeGravimetricaParaVolumetrica,
  REFERENCIAS_TEXTURAIS,
  UMIDADE_MEDIA_SOLO,
} from '../../lib/soilReferences';
import { MapContainer, Polygon, Marker, Popup } from 'react-leaflet';
import { initLeafletIcons } from '../../lib/leaflet-setup';
import { PolygonDrawer } from '../../components/map/MapUtils';
import { HybridSatelliteTiles } from '../../components/map/HybridSatelliteTiles';
import { Tooltip } from '../../components/ui/Tooltip';
import { FieldLabel } from '../../components/ui/FieldLabel';
import { SoilTextureTriangle } from '../../components/SoilTextureTriangle';
import { formatarCpf } from '../../lib/cpf';

initLeafletIcons();

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
    textura_referencia: '',
    cultura: '',
    prof_raiz_mm: '',
    eficiencia_ea: '',
    vazao_ip: '',
    pam: ''
  });

  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [formError, setFormError] = useState<string[]>([]);
  const [edicaoCarregada, setEdicaoCarregada] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<'pending' | 'saving' | 'saved' | 'local' | 'error'>('pending');
  const [draftSaveError, setDraftSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [produtorSearch, setProdutorSearch] = useState('');
  const [produtorSelectOpen, setProdutorSelectOpen] = useState(false);
  const [produtorActiveIndex, setProdutorActiveIndex] = useState(-1);
  const produtorSelectRef = useRef<HTMLDivElement>(null);

  const produtorSelecionado = produtores.find((produtor) => produtor.id === formData.produtor_id);
  const produtorLegado = areaEmEdicao && !produtorSelecionado
    ? { id: areaEmEdicao.produtor_id, nome: `Produtor já vinculado (${areaEmEdicao.produtor_id})` }
    : null;
  const opcoesProdutores = produtorLegado ? [...produtores, produtorLegado] : produtores;
  const produtorSearchNormalizado = produtorSearch
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
  const produtorSearchNumeros = produtorSearch.replace(/\D/g, '');
  const produtoresFiltrados = opcoesProdutores.filter((produtor) => {
    const nomeNormalizado = produtor.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    const cpfNumeros = produtor.cpf?.replace(/\D/g, '') || '';
    return nomeNormalizado.includes(produtorSearchNormalizado)
      || produtor.id.toLocaleLowerCase('pt-BR').includes(produtorSearchNormalizado)
      || Boolean(produtorSearchNumeros && cpfNumeros.includes(produtorSearchNumeros));
  });
  const produtorSelecionadoLabel = produtorSelecionado
    ? produtorSelecionado.cpf
      ? `${produtorSelecionado.nome} — CPF ${formatarCpf(produtorSelecionado.cpf)}`
      : produtorSelecionado.nome
    : produtorLegado?.nome || '';
  const recomendacoesCultura = listarCulturasMaisUsadas(areas);
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

  useEffect(() => {
    const fecharAoClicarFora = (event: PointerEvent) => {
      if (!produtorSelectRef.current?.contains(event.target as Node)) {
        setProdutorSelectOpen(false);
        setProdutorSearch('');
      }
    };
    document.addEventListener('pointerdown', fecharAoClicarFora);
    return () => document.removeEventListener('pointerdown', fecharAoClicarFora);
  }, []);

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
      coef_b: formatarNumeroLocalizado(String(-Math.abs(areaEmEdicao.solo.coef_b))),
      umidade_cc: formatarNumeroLocalizado(String(areaEmEdicao.solo.umidade_cc)),
      textura_referencia: areaEmEdicao.solo.textura_referencia || '',
      cultura: areaEmEdicao.cultura || '',
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
      const coefBDoRascunho = parseNumeroLocalizado(savedDraft.formData.coef_b);
      setFormData({
        ...savedDraft.formData,
        textura_referencia: savedDraft.formData.textura_referencia ?? '',
        cultura: savedDraft.formData.cultura ?? '',
        coef_b: Number.isFinite(coefBDoRascunho) && coefBDoRascunho > 0
          ? formatarNumeroLocalizado(String(-coefBDoRascunho))
          : savedDraft.formData.coef_b,
      });
      setPolygonPoints(savedDraft.polygonPoints);
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
    if (!temDadosMinimosParaRascunho(formData)) {
      setDraftSaveStatus('pending');
      setDraftSaveError('');
      return;
    }

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
      if (!temDadosMinimosParaRascunho(formData)) return;
      try {
        saveAreaDraftLocally(criarRascunhoFormulario());
      } catch (error) {
        setDraftSaveStatus('error');
        setDraftSaveError(
          `Não foi possível salvar o rascunho neste dispositivo: ${error instanceof Error ? error.message : 'erro desconhecido.'}`,
        );
      }
    };
  }, [draftReady, currentUser, draftId, areaId, step, formData, polygonPoints, setores, saveAreaDraft, saveAreaDraftLocally]);

  useEffect(() => {
    if (!draftReady || !currentUser) return;
    const saveBeforeUnload = () => {
      if (!temDadosMinimosParaRascunho(formData)) return;
      saveAreaDraftLocally(criarRascunhoFormulario());
    };
    window.addEventListener('beforeunload', saveBeforeUnload);
    return () => window.removeEventListener('beforeunload', saveBeforeUnload);
  }, [draftReady, currentUser, draftId, areaId, step, formData, polygonPoints, setores, saveAreaDraftLocally]);

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
    ...(formData.cultura.trim() ? { cultura: formData.cultura.trim() } : {}),
    ...(polygonPoints.length >= 3
      ? { poligono: polygonPoints.map(([lat, lng]) => ({ lat, lng })) }
      : {}),
    solo: {
      coef_a: parseNumeroLocalizado(formData.coef_a),
      coef_b: parseNumeroLocalizado(formData.coef_b),
      umidade_cc: parseNumeroLocalizado(formData.umidade_cc),
      ...(formData.textura_referencia
        ? { textura_referencia: formData.textura_referencia }
        : {}),
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
    setores,
    updated_at: Date.now(),
  });

  const validarDadosIniciais = () => {
    const profundidade = parseNumeroLocalizado(formData.prof_raiz_mm);
    return [
      ...(!formData.nome.trim() ? ['Informe o nome da área.'] : []),
      ...(!formData.produtor_id ? ['Selecione o produtor vinculado.'] : []),
      ...(!formData.cultura.trim() ? ['Informe o nome da cultura.'] : []),
      ...(!formData.prof_raiz_mm.trim()
        || !Number.isFinite(profundidade)
        || profundidade < 50
        || profundidade > 2000
        ? ['Informe uma profundidade radicular entre 50 e 2000 mm.']
        : []),
    ];
  };

  const validarEtapaAtual = () => {
    if (step === 1) return validarDadosIniciais();

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
        ['Coeficiente B (negativo)', formData.coef_b, -2, -0.001],
        ['Umidade na capacidade de campo', formData.umidade_cc, 0.01, 1],
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
    const problemasEtapa = [
      ...new Set([...validarDadosIniciais(), ...validarEtapaAtual()]),
    ];
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

  const aplicarReferenciaSolo = (id: string) => {
    const referencia = REFERENCIAS_TEXTURAIS.find(item => item.id === id);
    if (!referencia) {
      if (!id) setFormData(prev => ({ ...prev, textura_referencia: '' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      textura_referencia: referencia.id,
      umidade_cc: formatarNumeroLocalizado(String(
        converterUmidadeGravimetricaParaVolumetrica(UMIDADE_MEDIA_SOLO.cc),
      )),
    }));
  };

  const inputClass = "w-full min-w-0 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none";
  const selectClass = `${inputClass} bg-white`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0">
      <div className="mb-6 flex flex-wrap items-start gap-3 sm:mb-8 sm:flex-nowrap sm:items-center sm:gap-4">
        <button onClick={() => navigate(-1)} className="shrink-0 rounded-full p-2 -ml-2 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={24} className="text-slate-700" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight text-slate-800 sm:text-3xl">{areaEmEdicao ? 'Revisar Parâmetros da Área' : 'Cadastrar Nova Área'}</h1>
          <p className="text-slate-500">Configuração dos parâmetros de irrigação e mapeamento</p>
        </div>
        {draftReady && (
          <div className={`flex w-full items-center gap-2 text-xs font-semibold sm:ml-auto sm:w-auto ${
            draftSaveStatus === 'saved' ? 'text-green-700' : draftSaveStatus === 'saving' ? 'text-slate-500' : 'text-amber-800'
          }`}>
            {draftSaveStatus === 'error' ? <CloudOff size={16} /> : <Cloud size={16} />}
            <span>
              {draftSaveStatus === 'saved' ? 'Rascunho salvo' :
              draftSaveStatus === 'saving' ? 'Salvando rascunho…' :
                  draftSaveStatus === 'local' ? 'Salvo neste dispositivo' :
                    draftSaveStatus === 'pending' ? 'Preencha os dados do passo 1 para salvar' : 'Falha ao salvar rascunho'}
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
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-8 sm:p-4">
        <div className="mb-2 flex w-full items-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="relative flex min-w-0 flex-1 flex-col items-center">
              <div
                aria-current={step === i + 1 ? 'step' : undefined}
                aria-label={`Passo ${i + 1}${step > i + 1 ? ', concluído' : step === i + 1 ? ', atual' : ''}`}
                className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm
                ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                {step > i + 1 ? <Check size={16} /> : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`absolute left-1/2 top-3.5 h-1 w-full -translate-y-1/2 sm:top-4
                  ${step > i + 1 ? 'bg-green-500' : 'bg-slate-100'}`}></div>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-bold text-slate-500 mt-2">Passo {step} de {totalSteps}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {formError.length > 0 && (
          <div className="m-4 mb-0 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-6 sm:mb-0">
            <p className="font-bold mb-2">Corrija esta etapa antes de continuar:</p>
            <ul className="list-disc pl-5 space-y-1">
              {formError.map(problema => <li key={problema}>{problema}</li>)}
            </ul>
          </div>
        )}
        {avisosEtapaAtual.length > 0 && (
          <div className="m-4 mb-0 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:m-6 sm:mb-0" role="status">
            <p className="font-bold mb-2">Atenção: revise estes dados quando possível. Você pode continuar e salvar a área.</p>
            <ul className="list-disc pl-5 space-y-1">
              {avisosEtapaAtual.map((aviso) => <li key={aviso}>{aviso}</li>)}
            </ul>
          </div>
        )}
        <div className="p-4 sm:p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Dados Gerais</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Área/Talhão *</label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Talhão 1 — Soja Safra Verão" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="produtor-search" className="mb-1 block text-sm font-bold text-slate-700">Produtor vinculado *</label>
                  <div ref={produtorSelectRef} className="relative">
                    <div className="relative">
                      <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="produtor-search"
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={produtorSelectOpen}
                        aria-controls="produtor-options"
                        aria-activedescendant={
                          produtorSelectOpen && produtoresFiltrados.length > 0
                            ? `produtor-option-${produtoresFiltrados[produtorActiveIndex]?.id}`
                            : undefined
                        }
                        aria-label="Pesquisar e selecionar produtor"
                        autoComplete="off"
                        value={produtorSelectOpen ? produtorSearch : produtorSelecionadoLabel}
                        onFocus={() => {
                          setProdutorSearch('');
                          setProdutorActiveIndex(-1);
                          setProdutorSelectOpen(true);
                        }}
                        onChange={(event) => {
                          setProdutorSearch(event.currentTarget.value);
                          setProdutorActiveIndex(-1);
                          setProdutorSelectOpen(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            setProdutorSelectOpen(false);
                            setProdutorSearch('');
                          } else if (event.key === 'ArrowDown' && produtoresFiltrados.length > 0) {
                            event.preventDefault();
                            setProdutorActiveIndex((index) => index < 0
                              ? 0
                              : (index + 1) % produtoresFiltrados.length);
                            setProdutorSelectOpen(true);
                          } else if (event.key === 'ArrowUp' && produtoresFiltrados.length > 0) {
                            event.preventDefault();
                            setProdutorActiveIndex((index) => index < 0
                              ? produtoresFiltrados.length - 1
                              : (index - 1 + produtoresFiltrados.length) % produtoresFiltrados.length);
                            setProdutorSelectOpen(true);
                          } else if (event.key === 'Enter' && produtoresFiltrados.length > 0) {
                            event.preventDefault();
                            const produtor = produtoresFiltrados[
                              produtorActiveIndex >= 0 ? produtorActiveIndex : 0
                            ];
                            setFormData((current) => ({
                              ...current,
                              produtor_id: produtor.id,
                            }));
                            setProdutorSelectOpen(false);
                            setProdutorSearch('');
                          }
                        }}
                        placeholder="Pesquisar por nome, CPF ou UID"
                        className={`${inputClass} bg-white pl-10`}
                      />
                    </div>
                    {produtorSelectOpen && (
                      <div
                        id="produtor-options"
                        role="listbox"
                        aria-label="Produtores encontrados"
                        className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                      >
                        {produtoresFiltrados.length > 0 ? produtoresFiltrados.map((produtor, index) => (
                          <div
                            key={produtor.id}
                            id={`produtor-option-${produtor.id}`}
                            role="option"
                            tabIndex={-1}
                            aria-selected={formData.produtor_id === produtor.id}
                            onClick={() => {
                              setFormData((current) => ({ ...current, produtor_id: produtor.id }));
                              setProdutorSelectOpen(false);
                              setProdutorSearch('');
                            }}
                            onMouseMove={() => setProdutorActiveIndex(index)}
                            className={`cursor-pointer px-4 py-3 text-left text-sm text-slate-700 ${
                              index === produtorActiveIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                            } ${formData.produtor_id === produtor.id ? 'font-semibold' : ''}`}
                          >
                            <span className="block">{produtor.cpf
                              ? `${produtor.nome} — CPF ${formatarCpf(produtor.cpf)}`
                              : produtor.nome}</span>
                            {produtor.id === formData.produtor_id && (
                              <span className="mt-0.5 block text-xs text-blue-700">Selecionado</span>
                            )}
                          </div>
                        )) : (
                          <p className="px-4 py-3 text-sm text-slate-500" role="status">
                            {opcoesProdutores.length === 0
                              ? 'Nenhum produtor disponível para selecionar.'
                              : 'Nenhum produtor corresponde à pesquisa.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {opcoesProdutores.length > 0
                      ? 'Pesquise pelo nome, CPF ou UID e selecione um produtor da lista.'
                      : 'Nenhum produtor aparece na lista. Peça ao produtor para entrar novamente ou sincronize os perfis existentes pelo comando administrativo.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cultura" className="block text-sm font-bold text-slate-700 mb-1">Cultura *</label>
                    <input
                      id="cultura"
                      type="text"
                      name="cultura"
                      value={formData.cultura}
                      onChange={handleChange}
                      maxLength={100}
                      required
                      placeholder="Ex.: milho, café, pastagem"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="prof_raiz_mm" className="block text-sm font-bold text-slate-700 mb-1">Profundidade radicular (mm) *</label>
                    <input
                      id="prof_raiz_mm"
                      type="text"
                      inputMode="decimal"
                      name="prof_raiz_mm"
                      value={formData.prof_raiz_mm}
                      onChange={handleChange}
                      onBlur={handleNumericBlur}
                      required
                      placeholder="Ex.: 400"
                      className={inputClass}
                    />
                  </div>
                </div>
                {recomendacoesCultura.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                      <Sparkles size={16} />
                      Culturas e profundidades mais usadas
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Recomendações baseadas nas áreas que você já cadastrou; clique para preencher.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recomendacoesCultura.map((recomendacao) => (
                        <button
                          key={`${recomendacao.cultura}:${recomendacao.prof_raiz_mm}`}
                          type="button"
                          onClick={() => setFormData((current) => ({
                            ...current,
                            cultura: recomendacao.cultura,
                            prof_raiz_mm: formatarNumeroLocalizado(String(recomendacao.prof_raiz_mm)),
                          }))}
                          className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-left text-sm text-emerald-950 transition-colors hover:bg-emerald-100"
                        >
                          <span className="font-semibold">{recomendacao.cultura}</span>
                          <span> · {recomendacao.prof_raiz_mm} mm</span>
                          <span className="ml-1 text-xs text-emerald-700">({recomendacao.quantidade} áreas)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

              <div className="relative z-0 h-[min(400px,60vh)] w-full overflow-hidden rounded-xl border border-slate-300">
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
              <div className="flex min-w-0 flex-col gap-4">
                <SoilTextureTriangle selectedClass={formData.textura_referencia} />
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <label htmlFor="referencia-solo" className="block text-sm font-bold text-slate-800">
                    Referência textural do solo (opcional)
                  </label>
                  <select
                    id="referencia-solo"
                    value={formData.textura_referencia ?? ''}
                    onChange={(event) => aplicarReferenciaSolo(event.currentTarget.value)}
                    className={`${selectClass} mt-2`}
                  >
                    <option value="">Selecione a classe identificada no triângulo</option>
                    {REFERENCIAS_TEXTURAIS.map(referencia => (
                      <option key={referencia.id} value={referencia.id}>{referencia.nome}</option>
                    ))}
                  </select>
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    Use o triângulo como apoio visual e confirme a classe pela análise granulométrica. A planilha não informa valores de CC distintos por classe: ao selecionar uma, o campo CC recebe a média geral, 21% gravimétricos (faixa 18–26%), convertida para 0,252 cm³/cm³ (faixa 0,216–0,312) com Ds = 1,2 g/cm³. PMP médio: 9,5% (faixa 8–12%), apenas informativo. Os coeficientes A e B devem vir do laudo físico-hídrico.
                  </p>
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Parâmetros do Solo e Planta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Coeficiente A (a)" tooltip="Constante ajustada em laboratório para a curva θ = A × ψᴮ, com B negativo e ψ em kPa. Não use um valor genérico por textura." />
                  <input type="text" inputMode="decimal" name="coef_a" value={formData.coef_a} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Valor do laudo" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Coeficiente B (b, negativo)" tooltip="Expoente negativo ajustado em laboratório para a curva θ = A × ψᴮ. Informe o valor negativo do laudo, usando ψ em kPa." />
                  <input type="text" inputMode="decimal" name="coef_b" value={formData.coef_b} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Ex: -0,1" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Umidade Capac. Campo (θcc)" tooltip="Umidade volumétrica na capacidade de campo (cm³/cm³). Valores típicos: 0.10–0.50." />
                  <input type="text" inputMode="decimal" name="umidade_cc" value={formData.umidade_cc} onChange={handleChange} onBlur={handleNumericBlur} placeholder="Ex: 0,280" className={inputClass} />
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
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
                                className={selectClass}
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

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-6">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="rounded-lg px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-0 sm:px-6"
          >
            Voltar
          </button>

          {step < totalSteps ? (
            <button
              onClick={handleNextStep}
              className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white shadow-md transition-colors hover:bg-blue-700 sm:px-8"
            >
              Próximo Passo
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center rounded-lg bg-green-600 px-5 py-3 font-bold text-white shadow-md transition-colors hover:bg-green-700 sm:px-8"
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
