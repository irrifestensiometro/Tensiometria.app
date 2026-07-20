import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMapEvents, useMap, Polygon } from 'react-leaflet';
import { getAreaColor } from '../../lib/areaColors';

export function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

export function UpdateMapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

export function LocationSelector({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function PolygonDrawer({ points, setPoints }: { points: [number, number][], setPoints: React.Dispatch<React.SetStateAction<[number, number][]>> }) {
  useMapEvents({
    click(e) {
      setPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    }
  });

  return points.length > 0 ? (
    <Polygon positions={points} color="#2563eb" fillColor="#60a5fa" fillOpacity={0.4} />
  ) : null;
}

interface AreaLegendItem {
  id: string;
  nome: string;
}

export function MapLegend({ areas }: { areas: AreaLegendItem[] }) {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText = 'position: absolute; bottom: 20px; left: 20px; z-index: 1000; background: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; min-width: 140px; pointer-events: auto;';
    const mapEl = map.getContainer();
    mapEl.style.position = 'relative';
    mapEl.appendChild(el);
    setContainer(el);
    return () => { el.remove(); };
  }, [map]);

  if (!container) return null;

  return createPortal(
    <>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#334155' }}>Áreas</div>
      {areas.map(area => {
        const c = getAreaColor(area.id);
        return (
          <div key={area.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: c.fill, border: `2px solid ${c.stroke}`, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#475569' }}>{area.nome}</span>
          </div>
        );
      })}
    </>,
    container
  );
}
