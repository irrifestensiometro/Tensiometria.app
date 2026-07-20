const CORES = [
  { stroke: "#2563eb", fill: "#60a5fa", light: "#eff6ff" },
  { stroke: "#16a34a", fill: "#86efac", light: "#f0fdf4" },
  { stroke: "#d97706", fill: "#fbbf24", light: "#fffbeb" },
  { stroke: "#dc2626", fill: "#f87171", light: "#fef2f2" },
  { stroke: "#7c3aed", fill: "#a78bfa", light: "#f5f3ff" },
  { stroke: "#db2777", fill: "#f472b6", light: "#fdf2f8" },
  { stroke: "#0891b2", fill: "#67e8f9", light: "#ecfeff" },
  { stroke: "#ca8a04", fill: "#facc15", light: "#fefce8" },
  { stroke: "#65a30d", fill: "#a3e635", light: "#f7fee7" },
  { stroke: "#ea580c", fill: "#fb923c", light: "#fff7ed" },
];

export const getAreaColor = (areaId: string) => {
  let hash = 0;
  for (let i = 0; i < areaId.length; i++) {
    hash = ((hash << 5) - hash) + areaId.charCodeAt(i);
    hash |= 0;
  }
  return CORES[Math.abs(hash) % CORES.length];
};