import { MapContainer, Marker, Polygon, Polyline } from 'react-leaflet';
import { Map } from 'lucide-react';
import { HybridSatelliteTiles } from './HybridSatelliteTiles';

interface DraftMapPreviewProps {
  points: [number, number][];
}

export function DraftMapPreview({ points }: DraftMapPreviewProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
        <Map size={18} />
        <span>Limites ainda não desenhados</span>
      </div>
    );
  }

  const center: [number, number] = [
    points.reduce((sum, [lat]) => sum + lat, 0) / points.length,
    points.reduce((sum, [, lng]) => sum + lng, 0) / points.length,
  ];
  const bounds = points.length > 1 ? points : undefined;

  return (
    <div className="h-36 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={16}
        bounds={bounds}
        boundsOptions={{ padding: [18, 18], maxZoom: 17 }}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <HybridSatelliteTiles />
        {points.length >= 3 ? (
          <Polygon positions={points} color="#facc15" fillColor="#facc15" fillOpacity={0.35} weight={2} />
        ) : points.length === 2 ? (
          <Polyline positions={points} color="#facc15" weight={3} />
        ) : (
          <Marker position={points[0]} />
        )}
      </MapContainer>
    </div>
  );
}
