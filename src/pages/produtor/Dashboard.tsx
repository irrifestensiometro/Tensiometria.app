import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Map as MapIcon, AlertCircle, CheckCircle2, MapPin, Activity, Droplet, Sprout, LocateFixed } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl } from 'react-leaflet';
import type L from 'leaflet';
import { initLeafletIcons } from '../../lib/leaflet-setup';
import { Produtor } from '../../types';
import { salvarUsuario } from '../../lib/usuarioService';
import { getAreaColor } from '../../lib/areaColors';
import { MapController, UpdateMapCenter, LocationSelector, MapLegend } from '../../components/map/MapUtils';

// Inicializa os ícones do leaflet
initLeafletIcons();

export default function ProdutorDashboard() {
  const { areas, leituras, currentUser, updateProdutor } = useAppContext();
  const navigate = useNavigate();
  const produtor = currentUser as Produtor;

  // Filtra as áreas do produtor logado
  const minhasAreas = areas.filter(a => a.produtor_id === produtor.id);
  
  const hoje = new Date().toISOString().split('T')[0];
  const areasComLeituraHoje = minhasAreas.filter(area => 
    leituras.some(l => l.area_id === area.id && l.data.startsWith(hoje))
  );

  const leiturasPendentes = minhasAreas.length - areasComLeituraHoje.length;

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
      const dadosAtualizados = {
        ...produtor,
        localizacao_sede: { lat: sedeLatLng[0], lng: sedeLatLng[1] }
      };
      updateProdutor(dadosAtualizados);
      try {
        await salvarUsuario(produtor.id, {
          nome: produtor.nome,
          email: produtor.email,
          tipo: 'produtor',
          localizacao_sede: { lat: sedeLatLng[0], lng: sedeLatLng[1] }
        });
        setIsEditingLocation(false);
        alert('Localização da sede salva com sucesso!');
      } catch {
        alert('Erro ao salvar no banco de dados. A localização foi salva localmente.');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full space-y-10 animate-in fade-in duration-500">
      {/* 1. Visão Geral (KPIs) */}
      <section>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center">
            Olá, {produtor.nome.split(' ')[0]}! <span className="ml-2 text-2xl">👋</span>
          </h1>
          <p className="text-slate-500 mt-1 mb-6">Acompanhe suas áreas de plantio</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#2D7D46] p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-white/20 p-2.5 rounded-xl">
              <MapIcon size={20} className="text-white" />
            </div>
            <p className="text-emerald-50 text-sm font-medium mb-2">Total de Áreas</p>
            <h2 className="text-4xl font-bold mb-4">{minhasAreas.length}</h2>
            <p className="text-emerald-100 text-xs">Vinculadas ao seu perfil</p>
          </div>

          <div className="bg-[#fff8eb] p-6 rounded-2xl border border-[#ffe9c2] shadow-sm relative">
            <div className="absolute top-4 right-4 bg-[#ffdfa8] p-2.5 rounded-xl">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium mb-2">Leituras Pendentes</p>
            <h2 className="text-4xl font-bold text-slate-800 mb-4">{leiturasPendentes}</h2>
            <p className="text-slate-500 text-xs">Hoje</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
            <div className="absolute top-4 right-4 bg-slate-100 p-2.5 rounded-xl">
              <Activity size={20} className="text-slate-500" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-2">Status da Fazenda</p>
            <h2 className="text-xl font-bold text-slate-800 mt-1 mb-2 leading-tight">
              {leiturasPendentes === 0 && minhasAreas.length > 0 ? 'Tudo Atualizado' : 'Ação Necessária'}
            </h2>
            <p className="text-slate-400 text-xs">
              {leiturasPendentes === 0 && minhasAreas.length > 0 ? 'Parabéns!' : 'Verifique os talhões pendentes'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Mapa */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-4 md:space-y-0">
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
          <div className="flex items-center space-x-3">
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
        
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
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
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-6">Suas Áreas</h2>
        
        {minhasAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 bg-white p-12 rounded-2xl border border-slate-200 shadow-sm">
            <MapIcon size={48} className="mb-4 opacity-30" />
            <p className="font-medium">Nenhuma área cadastrada pelo seu agrônomo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {minhasAreas.map(area => {
              const temLeituraHoje = leituras.some(l => l.area_id === area.id && l.data.startsWith(hoje));
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
                        <p className={"font-bold " + (!temLeituraHoje && 'text-slate-400')}>{temLeituraHoje ? 'Ideal' : 'Desconhecida'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Umidade</p>
                      <p className={"font-black " + (temLeituraHoje ? 'text-slate-800' : 'text-slate-400')}>{temLeituraHoje ? '28.6%' : '--%'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6 flex-1 relative">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center space-x-3">
                      <Sprout size={16} className="text-green-600 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Cultura</p>
                        <p className="font-bold text-slate-700 text-sm truncate">Milho</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center space-x-3">
                      <Droplet size={16} className="text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Irrigação</p>
                        <p className="font-bold text-slate-700 text-sm truncate">Gotejamento</p>
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
