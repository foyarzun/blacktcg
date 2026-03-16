export const COMUNAS_COORDS: Record<string, { lat: number; lon: number }> = {
  "Santiago": { lat: -33.4489, lon: -70.6693 },
  "Las Condes": { lat: -33.4121, lon: -70.5658 },
  "Providencia": { lat: -33.4312, lon: -70.6122 },
  "Viña del Mar": { lat: -33.0245, lon: -71.5518 },
  "Valparaíso": { lat: -33.0472, lon: -71.6127 },
  "Concepción": { lat: -36.8201, lon: -73.0444 },
  "Antofagasta": { lat: -23.6509, lon: -70.3975 },
  "La Serena": { lat: -29.9027, lon: -71.2519 },
  "Temuco": { lat: -38.7359, lon: -72.5904 },
  "Puerto Montt": { lat: -41.4657, lon: -72.9421 },
  "Puerto Varas": { lat: -41.3195, lon: -72.9854 },
  "Rancagua": { lat: -34.1708, lon: -70.7444 },
  "Talca": { lat: -35.4264, lon: -71.6554 },
  "Arica": { lat: -18.4783, lon: -70.3126 },
  "Iquique": { lat: -20.2307, lon: -70.1357 },
  "Chillán": { lat: -36.6063, lon: -72.1021 },
  "Puente Alto": { lat: -33.6117, lon: -70.5757 },
  "Maipú": { lat: -33.5106, lon: -70.7572 },
  "La Florida": { lat: -33.5227, lon: -70.5983 },
};

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

export function getDistanceInfo(comuna1: string, comuna2: string) {
  if (!comuna1 || !comuna2) return null;
  if (comuna1.toLowerCase() === comuna2.toLowerCase()) {
    return "En tu misma ciudad";
  }
  const c1 = COMUNAS_COORDS[comuna1];
  const c2 = COMUNAS_COORDS[comuna2];
  if (c1 && c2) {
    const dist = calculateDistance(c1.lat, c1.lon, c2.lat, c2.lon);
    return `Aprox. ${dist} km de distancia`;
  }
  return `Vendedor en ${comuna2}`;
}
