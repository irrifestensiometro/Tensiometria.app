import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Map as MapIcon, AlertCircle, CheckCircle2, MapPin, Activity, Droplet, Sprout, LocateFixed } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl } from 'react-leaflet';
import type L from 'leaflet';
import { initLeafletIcons } from '../../lib/leaflet-setup';
import { Produtor } from '../../types';
import { atualizarPerfilProdutor } from '../../lib/usuarioService';
import { getAreaColor } from '../../lib/areaColors';
import { MapController, UpdateMapCenter, LocationSelector, MapLegend } from '../../components/map/MapUtils';
import { HybridSatelliteTiles } from '../../components/map/HybridSatelliteTiles';
import { calcularIrrigacao } from '../../lib/irrigationMath';

// Inicializa os ícones do leaflet
initLeafletIcons();

export default function ProdutorDashboard() {
  const { areas, leituras, currentUser, updateProdutor } = useAppContext();
  const navigate = useNavigate();
  const produtor = currentUser as Produtor;

  // Filtra as áreas do produtor logado
  const minhasAreas = areas.filter(a => a.produtor_id === produtor.id);
  
  const hoje = new Date().toDateString();
  const areasComLeituraHoje = minhasAreas.filter(area => 
    leituras.some(l => l.area_id === area.id && new Date(l.data).toDateString() === hoje)
  );

  const leiturasPendentes = minhasAreas.length - areasComLeituraHoje.length;
  const statusPropriedade = minhasAreas.length === 0
    ? 'Aguardando áreas'
    : leiturasPendentes === 0
      ? 'Tudo atualizado'
      : 'Ação necessária';

  const [mapCenter, setMapCenter] = useState<[number, number]>(
    produtor.localizacao_sede ? [produtor.localizacao_sede.lat, produtor.localizacao_sede.lng] : [-20.3155, -40.3128]
  );
  const [sedeLatLng, setSedeLatLng] = useState<[number, number] | null>(
    produtor.localizacao_sede ? [produtor.localizacao_sede.lat, produtor.localizacao_sede.lng] : null
  );
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const onMapReady = useCallback((map: L.Map) => { mapRef.current = map; }, []);

  useEffect(() => {
    if (produtor.localizacao_sede) {
      setMapCenter([produtor.localizacao_sede.lat, produtor.localizacao_sede.lng]);
      setSedeLatLng([produtor.localizacao_sede.lat, produtor.localizacao_sede.lng]);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {}
      );
    }
  }, [produtor.localizacao_sede]);

  const handleLocationSelect = (lat: number, lng: number) => {
    if (!isEditingLocation) return;
    setSedeLatLng([lat, lng]);
  };

  const handleStartEdit = () => {
    setIsEditingLocation(true);
  };

  const handleCancelEdit = () => {
    setIsEditingLocation(false);
    setSedeLatLng(
      produtor.localizacao_sede ? [produtor.localizacao_sede.lat, produtor.localizacao_sede.lng] : null
    );
  };

  const handleSaveSede = async () => {
    if (sedeLatLng) {
      try {
        const localizacao_sede = { lat: sedeLatLng[0], lng: sedeLatLng[1] };
        await atualizarPerfilProdutor(produtor.id, {
          nome: produtor.nome,
          localizacao_sede,
        });
        updateProdutor({ ...produtor, localizacao_sede });
        setIsEditingLocation(false);
        alert('Localização da sede salva com sucesso!');
      } catch (error) {
        alert(`Não foi possível salvar a localização: ${error instanceof Error ? error.message : 'erro desconhecido.'}`);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-7 sm:space-y-9 animate-in fade-in duration-500">
      {/* 1. Visão Geral (KPIs) */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#99694b]">Painel do produtor</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              Olá, {produtor.nome.split(' ')[0]}
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">Acompanhe suas áreas de plantio e as leituras de irrigação.</p>
          </div>
          {minhasAreas.length > 0 && (
            <button
              onClick={() => navigate('/produtor/leituras/nova')}
              className="w-full shrink-0 rounded-xl bg-[#b57d59] px-5 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[#99694b] sm:w-auto"
            >
              Inserir leitura
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-[#2D7D46] p-4 text-white shadow-sm sm:p-6">
            <div className="absolute right-3 top-3 rounded-xl bg-white/20 p-2 sm:right-4 sm:top-4 sm:p-2.5">
              <MapIcon size={20} className="text-white" />
            </div>
            <p className="mb-2 pr-8 text-xs font-medium text-emerald-50 sm:text-sm">Áreas</p>
            <h2 className="mb-2 text-3xl font-bold sm:mb-3 sm:text-4xl">{minhasAreas.length}</h2>
            <p className="text-[11px] text-emerald-100 sm:text-xs">Vinculadas ao seu perfil</p>
          </div>

          <div className="relative rounded-2xl border border-[#ffe9c2] bg-[#fff8eb] p-4 shadow-sm sm:p-6">
            <div className="absolute right-3 top-3 rounded-xl bg-[#ffdfa8] p-2 sm:right-4 sm:top-4 sm:p-2.5">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <p className="mb-2 pr-8 text-xs font-medium text-slate-600 sm:text-sm">Leituras pendentes</p>
            <h2 className="mb-2 text-3xl font-bold text-slate-800 sm:mb-3 sm:text-4xl">{leiturasPendentes}</h2>
            <p className="text-[11px] text-slate-500 sm:text-xs">Para hoje</p>
          </div>

          <div className="relative col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1 sm:p-6">
            <div className="absolute right-3 top-3 rounded-xl bg-slate-100 p-2 sm:right-4 sm:top-4 sm:p-2.5">
              <Activity size={20} className="text-slate-500" />
            </div>
            <p className="mb-2 pr-8 text-xs font-medium text-slate-500 sm:text-sm">Status da propriedade</p>
            <h2 className="mb-2 mt-1 text-lg font-bold leading-tight text-slate-800 sm:text-xl">
              {statusPropriedade}
            </h2>
            <p className="text-[11px] text-slate-400 sm:text-xs">
              {minhasAreas.length === 0
                ? 'Aguardando cadastro do agrônomo'
                : leiturasPendentes === 0
                  ? 'Todas as áreas têm leitura hoje'
                  : 'Verifique as áreas pendentes'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Mapa */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <MapPin className="mr-2 text-[#b57d59]" />
              Mapa da Propriedade
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isEditingLocation
                ? 'Clique no mapa para marcar a nova localização da sede.'
                : 'Visualize sua sede e áreas no mapa.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isEditingLocation ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSede}
                  disabled={!sedeLatLng}
                  className="bg-[#b57d59] hover:bg-[#99694b] text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm disabled:opacity-50"
                >
                  Salvar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (!navigator.geolocation) {
                      alert('Geolocalização não é suportada pelo seu navegador.');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        setMapCenter([lat, lng]);
                        mapRef.current?.flyTo([lat, lng], 15);
                      },
                      () => {
                        alert('Não foi possível obter a localização atual. Verifique as permissões do navegador.');
                      }
                    );
                  }}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm flex items-center"
                >
                  <LocateFixed size={16} className="mr-2" />
                  Minha Localização
                </button>
                <button
                  onClick={handleStartEdit}
                  className="bg-[#b57d59] hover:bg-[#99694b] text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm"
                >
                  {produtor.localizacao_sede ? 'Alterar Localização' : 'Definir Localização'}
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="relative z-0 h-[300px] w-full overflow-hidden rounded-xl border border-slate-200 sm:h-[360px] lg:h-[420px]">
          <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="h-full w-full">
            <LayersControl position="topright">
              <LayersControl.BaseLayer name="Mapa Padrão">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer checked name="Satélite (Híbrido)">
                <HybridSatelliteTiles />
              </LayersControl.BaseLayer>
            </LayersControl>
            
            <MapController onMapReady={onMapReady} />
            <UpdateMapCenter center={mapCenter} />
            {isEditingLocation && <LocationSelector onLocationSelect={handleLocationSelect} />}
            
            {sedeLatLng && (
              <Marker position={sedeLatLng}>
                <Popup>Sede da Fazenda</Popup>
              </Marker>
            )}

            {minhasAreas.map(area => {
              if (!area.poligono || area.poligono.length === 0) return null;
              const positions: [number, number][] = area.poligono.map(p => [p.lat, p.lng]);
              const ac = getAreaColor(area.id);
              return (
                <Polygon key={area.id} positions={positions} color={ac.stroke} fillColor={ac.fill} fillOpacity={0.4}>
                  <Popup>{area.nome}</Popup>
                </Polygon>
              );
            })}

            {minhasAreas.length > 0 && (
              <MapLegend areas={minhasAreas.map(a => ({ id: a.id, nome: a.nome }))} />
            )}
          </MapContainer>
        </div>
      </section>

      {/* 3. Lista de Áreas */}
      <section id="areas" className="scroll-mt-28">
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Suas áreas</h2>
          <p className="mt-1 text-sm text-slate-500">Consulte o estado de cada área e registre novas leituras.</p>
        </div>
        
        {minhasAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm sm:py-14">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#99694b]">
              <MapIcon size={26} />
            </div>
            <p className="font-semibold text-slate-800">Nenhuma área disponível ainda</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">Quando seu agrônomo cadastrar e vincular uma área ao seu perfil, ela aparecerá aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {minhasAreas.map(area => {
              const leiturasHoje = leituras
                .filter(l => l.area_id === area.id && new Date(l.data).toDateString() === hoje)
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
              const leituraHoje = leiturasHoje[0];
              const temLeituraHoje = Boolean(leituraHoje);
              let resultadoHoje = null;
              if (leituraHoje) {
                try {
                  resultadoHoje = calcularIrrigacao(area, leituraHoje.valores);
                } catch {
                  resultadoHoje = null;
                }
              }
              const setoresParaIrrigar = resultadoHoje?.setores.filter(setor => setor.necessitaIrrigacao) || [];
              const quantidadeSetores = new Set(area.tensiometros.map(tensiometro => tensiometro.setor?.trim() || 'Tensiômetros')).size;
              const ac = getAreaColor(area.id);
              const glowShadow = 'inset 0 0 20px ' + ac.fill + '44, 0 0 25px ' + ac.fill + '33, 0 0 0 2px ' + ac.stroke + '22';
              
              return (
                <div key={area.id} className="relative rounded-2xl border bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md flex flex-col h-full group" style={{ borderColor: ac.stroke }}>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: glowShadow }} />
                  <div className="flex justify-between items-start mb-2 relative">
                    <h3 className="text-lg font-bold text-slate-800">{area.nome}</h3>
                    <span className={"flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 " + (temLeituraHoje ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100')}>
                      {temLeituraHoje ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      <span>{temLeituraHoje ? 'Leitura Hoje' : 'Pendente'}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center text-slate-500 text-sm mb-6 relative">
                    <MapPin size={14} className="mr-1" />
                    <span className="truncate">{area.poligono ? 'Área mapeada' : 'Sem mapa'}</span>
                  </div>

                  <div className={"rounded-xl p-4 flex justify-between items-center mb-4 border relative " + (temLeituraHoje ? 'bg-[#f0f9ff] border-[#e0f2fe]' : 'bg-slate-50 border-slate-100')}>
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Droplet size={18} />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-blue-500">Condição do solo</p>
                        <p className={"font-bold " + (!temLeituraHoje ? 'text-slate-400' : !resultadoHoje ? 'text-red-700' : setoresParaIrrigar.length > 0 ? 'text-blue-700' : 'text-green-700')}>
                          {!temLeituraHoje ? 'Desconhecida' : !resultadoHoje ? 'Parâmetros inválidos' : setoresParaIrrigar.length > 0 ? `Irrigar ${setoresParaIrrigar.length} setor(es)` : 'Não irrigar'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Setores</p>
                      <p className={"font-black " + (temLeituraHoje ? 'text-slate-800' : 'text-slate-400')}>
                        {resultadoHoje?.setores.length ?? quantidadeSetores}
                      </p>
                    </div>
                  </div>
                  {resultadoHoje && (
                    <div className="relative mb-5 flex flex-wrap gap-2">
                      {resultadoHoje.setores.map(setor => (
                        <span
                          key={setor.setor}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${setor.necessitaIrrigacao ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}
                        >
                          {setor.setor}: {setor.necessitaIrrigacao ? 'Irrigar' : 'Não irrigar'}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-6 flex-1 relative">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center space-x-3">
                      <Activity size={16} className="text-green-600 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Tensiômetros</p>
                        <p className="font-bold text-slate-700 text-sm truncate">{area.tensiometros.length}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center space-x-3">
                      <Sprout size={16} className="text-green-600 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Prof. radicular</p>
                        <p className="font-bold text-slate-700 text-sm truncate">{area.planta.prof_raiz_mm} mm</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-auto relative">
                    <button 
                      onClick={() => navigate('/produtor/areas/' + area.id)}
                      className="w-full py-3 border font-bold rounded-xl transition-colors bg-white hover:bg-slate-50 border-slate-200 text-slate-700 text-sm"
                    >
                      Detalhes
                    </button>
                    <button 
                      onClick={() => navigate('/produtor/leituras/nova', { state: { areaId: area.id } })}
                      className="w-full py-3 border font-bold rounded-xl transition-colors bg-[#b57d59] hover:bg-[#99694b] text-white border-transparent text-sm"
                    >
                      Inserir Leitura
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
