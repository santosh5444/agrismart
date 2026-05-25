/**
 * Calculate the great circle distance between two points 
 * on the earth (specified in decimal degrees)
 */
export function calculateDistance(lat1: number | undefined, lon1: number | undefined, lat2: number | undefined, lon2: number | undefined): number | null {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  
  return Number(d.toFixed(1));
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}
