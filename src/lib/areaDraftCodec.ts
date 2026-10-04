import type { AreaDraft } from '../types';

export function serializarRascunhoArea(draft: AreaDraft) {
  return {
    ...draft,
    polygonPoints: draft.polygonPoints.map(([lat, lng]) => ({ lat, lng })),
  };
}

export function desserializarRascunhoArea(data: Record<string, unknown>): AreaDraft {
  const polygonPoints = Array.isArray(data.polygonPoints)
    ? data.polygonPoints.flatMap((point): [number, number][] => {
        if (
          point
          && typeof point === 'object'
          && 'lat' in point
          && 'lng' in point
          && typeof point.lat === 'number'
          && typeof point.lng === 'number'
        ) {
          return [[point.lat, point.lng]];
        }
        return [];
      })
    : [];
  return { ...data, polygonPoints } as AreaDraft;
}
