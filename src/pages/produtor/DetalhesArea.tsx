import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { MapContainer, TileLayer, Polygon, Popup, Marker } from 'react-leaflet';
import { initLeafletIcons } from '../../lib/leaflet-setup';
import { getAreaColor } from '../../lib/areaColors';
import { Produtor } from '../../types';
import { ArrowLeft, Droplet, Sprout, Calendar, Clock, Activity, AlertTriangle, CheckCircle2, CloudRain, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

initLeafletIcons();

export default function DetalhesArea() {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const { areas, leituras, currentUser } = useAppContext();
  const produtor = currentUser as Produtor | null;

  const area = areas.find(a => a.id === areaId);
  const leiturasArea = leituras.filter(l => l.area_id === areaId).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const [mapCenter, setMapCenter] = useState<[number, number]>(
    produtor?.localizacao_sede
      ? [produtor.localizacao_sede.lat, produtor.localizacao_sede.lng]
      : area?.poligono && area.poligono.length > 0
        ? [area.poligono[0].lat, area.poligono[0].lng]
        : [-20.3155, -40.3128]
  );

  useEffect(() => {
    if (produtor?.localizacao_sede) {
      setMapCenter([produtor.localizacao_sede.lat, produtor.localizacao_sede.lng]);
    } else if (area?.poligono && area.poligono.length > 0) {
      setMapCenter([area.poligono[0].lat, area.poligono[0].lng]);
    }
  }, [area, produtor]);

  if (!area) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-slate-500 font-medium">Área não encontrada.</p>
        <button onClick={() => navigate('/produtor/dashboard')} className="mt-4 text-[#b57d59] font-bold">Voltar</button>
      </div>
    );
  }

  const ultimaLeitura = leiturasArea[0];
  const hoje = new Date().toISOString().split('T')[0];
  const temLeituraHoje = ultimaLeitura && ultimaLeitura.data.startsWith(hoje);

  // Calcula um status simples e fictício baseado na média dos tensiômetros (quanto maior o valor, mais seco o solo)
  const mediaTensiometro = ultimaLeitura 
    ? ultimaLeitura.valores.reduce((acc, curr) => acc + curr.leitura_kpa, 0) / ultimaLeitura.valores.length 
    : null;

  let statusGeral = { text: 'Desconhecido', color: 'text-slate-500', bg: 'bg-slate-100', borderColor: 'border-slate-200', icon: <AlertTriangle size={24} /> };
  let recomendacao = 'Nenhuma leitura recente. Insira uma nova leitura para visualizar a recomendação de irrigação.';

  if (mediaTensiometro !== null) {
    if (mediaTensiometro < 20) {
      statusGeral = { text: 'Solo Úmido', color: 'text-blue-700', bg: 'bg-blue-50', borderColor: 'border-blue-200', icon: <CloudRain size={24} className="text-blue-600" /> };
      recomendacao = 'O solo está com boa umidade. Não é necessário irrigar no momento.';
    } else if (mediaTensiometro < 50) {
      statusGeral = { text: 'Condição Ideal', color: 'text-green-700', bg: 'bg-green-50', borderColor: 'border-green-200', icon: <CheckCircle2 size={24} className="text-green-600" /> };
      recomendacao = 'O solo apresenta condições ideais. Continue monitorando.';
    } else if (mediaTensiometro < 70) {
      statusGeral = { text: 'Atenção', color: 'text-amber-700', bg: 'bg-amber-50', borderColor: 'border-amber-200', icon: <AlertTriangle size={24} className="text-amber-600" /> };
      recomendacao = 'O solo está começando a secar. Prepare-se para irrigar em breve.';
    } else {
      statusGeral = { text: 'Crítico / Seco', color: 'text-red-700', bg: 'bg-red-50', borderColor: 'border-red-200', icon: <AlertTriangle size={24} className="text-red-600" /> };
      recomendacao = 'O solo está muito seco! Recomendamos iniciar a irrigação o mais rápido possível para evitar estresse hídrico na planta.';
    }
  }

  const positions = area.poligono?.map(p => [p.lat, p.lng] as [number, number]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/produtor/dashboard')}
            className="p-2 hover:bg-white rounded-full transition-colors bg-slate-50 border border-slate-200"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{area.nome}</h1>
            <p className="text-sm text-slate-500 font-medium flex items-center mt-1">
              <Sprout size={14} className="mr-1" /> Cultura de acompanhamento
            </p>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/produtor/leituras/nova`, { state: { areaId: area.id } })}
          className="bg-[#b57d59] hover:bg-[#99694b] text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm flex items-center text-sm"
        >
          <Activity size={18} className="mr-2" />
          Nova Leitura
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Situação */}
          <div className={`p-6 rounded-2xl border ${statusGeral.borderColor} ${statusGeral.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-full bg-white shadow-sm border ${statusGeral.borderColor}`}>
                {statusGeral.icon}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Status Atual do Solo</p>
                <h2 className={`text-3xl font-black ${statusGeral.color}`}>{statusGeral.text}</h2>
              </div>
            </div>
            <div className="bg-white/60 p-4 rounded-xl border border-white/40 flex-1 w-full md:w-auto">
              <p className="text-slate-700 font-medium text-sm leading-relaxed">
                {recomendacao}
              </p>
            </div>
          </div>

          {/* Dados Técnicos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <Droplet size={20} className="mr-2 text-blue-500" /> 
              Detalhes da Irrigação
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Vazão do Sistema (Ip)</p>
                <p className="font-bold text-slate-800 text-lg">{area.irrigacao.vazao_ip} <span className="text-sm font-medium text-slate-500">mm/h</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Eficiência (Ea)</p>
                <p className="font-bold text-slate-800 text-lg">{(area.irrigacao.eficiencia_ea * 100).toFixed(0)} <span className="text-sm font-medium text-slate-500">%</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Profundidade Raiz (Z)</p>
                <p className="font-bold text-slate-800 text-lg">{area.planta.prof_raiz_mm} <span className="text-sm font-medium text-slate-500">mm</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tensiômetros</p>
                <p className="font-bold text-slate-800 text-lg">{area.tensiometros.length}</p>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Localização da Área</h3>
            <div className="h-[300px] w-full rounded-xl overflow-hidden border border-slate-200">
              <MapContainer
                center={mapCenter}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {produtor?.localizacao_sede && (
                  <Marker position={[produtor.localizacao_sede.lat, produtor.localizacao_sede.lng]}>
                    <Popup>Sede: {produtor.nome}</Popup>
                  </Marker>
                )}
                {positions && positions.length >= 3 && (
                  <Polygon positions={positions} color={getAreaColor(area.id).stroke} fillColor={getAreaColor(area.id).fill} fillOpacity={0.4}>
                    <Popup>{area.nome}</Popup>
                  </Polygon>
                )}
              </MapContainer>
            </div>
            {(!positions || positions.length < 3) && (
              <p className="text-sm text-slate-400 mt-3 flex items-center">
                <MapPin size={14} className="mr-1" />
                {produtor?.localizacao_sede
                  ? 'Sede exibida no mapa. Desenhe o polígono da área pelo painel.'
                  : 'Nenhum polígono desenhado para esta área.'}
              </p>
            )}
          </div>
        </div>

        {/* Histórico Lateral */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <Calendar size={20} className="mr-2 text-slate-400" />
            Histórico de Leituras
          </h3>

          {leiturasArea.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Activity size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma leitura registrada para esta área ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leiturasArea.map((leitura, index) => {
                const dataLeitura = parseISO(leitura.data);
                const mediaKpa = leitura.valores.reduce((acc, curr) => acc + curr.leitura_kpa, 0) / leitura.valores.length;
                
                let textColor = 'text-green-600';
                if (mediaKpa > 50) textColor = 'text-amber-600';
                if (mediaKpa > 70) textColor = 'text-red-600';
                if (mediaKpa < 20) textColor = 'text-blue-600';

                return (
                  <div key={leitura.id} className={`p-4 rounded-xl border ${index === 0 ? 'bg-slate-50 border-slate-200 shadow-sm' : 'border-slate-100 hover:bg-slate-50 transition-colors'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center text-sm font-bold text-slate-700">
                        <Clock size={14} className="mr-1.5 text-slate-400" />
                        {format(dataLeitura, "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </div>
                      {index === 0 && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full uppercase">Mais Recente</span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {leitura.valores.map(v => {
                        const tensiometro = area.tensiometros.find(t => t.id === v.tensiometro_id);
                        return (
                          <div key={v.tensiometro_id} className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Prof. {tensiometro?.prof_cm || '?'}cm</span>
                            <span className="font-bold text-slate-700">{v.leitura_kpa} <span className="text-[10px] text-slate-400">kPa</span></span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Média Geral</span>
                      <span className={`font-black ${textColor}`}>{mediaKpa.toFixed(1)} <span className="text-[10px]">kPa</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
