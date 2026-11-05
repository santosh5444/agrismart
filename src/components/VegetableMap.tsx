import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { MapPin, User, Phone } from 'lucide-react';
import { getVegTelugu } from '../utils/telugu';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
try {
  if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }
} catch (err) {
  console.error("Leaflet default icon fix failed:", err);
}

// Safe, zero-network SVG markers that never break or fail to load
let cachedGreenIcon: any = null;
let cachedBlueIcon: any = null;

const greenSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="40" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));"><path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#16a34a" stroke="#ffffff" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="#ffffff"/></svg>`;
const blueSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="40" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));"><path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#2563eb" stroke="#ffffff" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="#ffffff"/></svg>`;

const getGreenIcon = () => {
  if (cachedGreenIcon) return cachedGreenIcon;
  try {
    cachedGreenIcon = L.divIcon({
      className: 'custom-green-marker',
      html: greenSvg,
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -36]
    });
    return cachedGreenIcon;
  } catch (err) {
    console.error("Failed to create Leaflet greenIcon:", err);
    return undefined;
  }
};

const getBlueIcon = () => {
  if (cachedBlueIcon) return cachedBlueIcon;
  try {
    cachedBlueIcon = L.divIcon({
      className: 'custom-blue-marker',
      html: blueSvg,
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -36]
    });
    return cachedBlueIcon;
  } catch (err) {
    console.error("Failed to create Leaflet blueIcon:", err);
    return undefined;
  }
};

interface MapProps {
  locations: {
    lat: number;
    lon: number;
    vegetable: string;
    district: string;
    avg_price: number;
    type?: 'Market' | 'Farmer';
    farmer_name?: string;
    mobile?: string;
  }[];
  consumerLoc?: { lat: number; lon: number } | null;
}

function MapUpdater({ locations, consumerLoc }: { locations: MapProps['locations']; consumerLoc?: MapProps['consumerLoc'] }) {
  const map = useMap();
  
  useEffect(() => {
    const points: [number, number][] = [];
    if (consumerLoc && 
        typeof consumerLoc.lat === 'number' && !isNaN(consumerLoc.lat) && 
        typeof consumerLoc.lon === 'number' && !isNaN(consumerLoc.lon)) {
      points.push([consumerLoc.lat, consumerLoc.lon]);
    }
    
    const safeLocs = Array.isArray(locations) ? locations : [];
    safeLocs.forEach(l => {
      if (l && 
          typeof l.lat === 'number' && !isNaN(l.lat) && 
          typeof l.lon === 'number' && !isNaN(l.lon)) {
        points.push([l.lat, l.lon]);
      }
    });

    if (points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: points.length === 1 ? 14 : 12 });
      } catch (err) {
        console.error("Leaflet fitBounds crash avoided:", err);
      }
    } else {
      // Reset view to Andhra Pradesh if no results
      map.setView([15.9129, 79.7400], 6);
    }
  }, [locations, consumerLoc, map]);

  return null;
}

export default function VegetableMap({ locations = [], consumerLoc }: MapProps) {
  // Center of Andhra Pradesh
  const center: [number, number] = [15.9129, 79.7400];
  const safeLocations = Array.isArray(locations) ? locations : [];

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner" style={{isolation: 'isolate'}}>
      <MapContainer 
        center={center} 
        zoom={6} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render Consumer Marker if coordinates locked */}
        {consumerLoc && 
         typeof consumerLoc.lat === 'number' && !isNaN(consumerLoc.lat) && 
         typeof consumerLoc.lon === 'number' && !isNaN(consumerLoc.lon) && (
          <Marker position={[consumerLoc.lat, consumerLoc.lon]} icon={getBlueIcon()}>
            <Popup>
              <div className="font-sans min-w-[120px] p-1">
                <h4 className="font-black text-blue-600 flex items-center gap-1.5 text-xs"><User className="w-3.5" /> Your Location</h4>
                <p className="text-[10px] text-gray-500 mt-1">Delivery Destination</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Farmer Markers */}
        {safeLocations
          .filter(loc => loc && typeof loc.lat === 'number' && !isNaN(loc.lat) && typeof loc.lon === 'number' && !isNaN(loc.lon))
          .map((loc, i) => (
            <Marker 
              key={`${loc.district}-${loc.vegetable}-${i}`} 
              position={[loc.lat, loc.lon]}
              icon={getGreenIcon()}
            >
              <Popup className="rounded-lg">
                <div className="font-sans min-w-[150px]">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-bold text-base text-gray-900 leading-tight">{loc.vegetable}</h3>
                      {getVegTelugu(loc.vegetable) && (
                        <span className="text-[11px] text-green-700 font-bold block">{getVegTelugu(loc.vegetable)}</span>
                      )}
                    </div>
                    {loc.type === 'Farmer' && (
                      <span className="bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Farmer</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" /> {loc.district}
                  </p>
                  
                  {loc.type === 'Farmer' ? (
                    <div className="border-t border-gray-100 pt-2 space-y-1.5">
                      <p className="text-[11px] text-gray-600 font-medium">Seller: <span className="text-gray-900 font-bold">{loc.farmer_name}</span></p>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md font-bold">
                          ✅ Verified Farm · Home Delivery
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Market Avg</span>
                      <span className="text-base font-bold text-agri-600">₹{loc.avg_price}/kg</span>
                    </div>
                  )}
                  <div className="mt-2 text-[9px] text-gray-300 font-mono">
                    {loc.lat.toFixed(3)}, {loc.lon.toFixed(3)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Draw dotted line paths from consumer to visible farmers */}
        {consumerLoc && 
         typeof consumerLoc.lat === 'number' && !isNaN(consumerLoc.lat) && 
         typeof consumerLoc.lon === 'number' && !isNaN(consumerLoc.lon) && 
          safeLocations
            .filter(loc => loc && typeof loc.lat === 'number' && !isNaN(loc.lat) && typeof loc.lon === 'number' && !isNaN(loc.lon))
            .map((loc, i) => (
              <Polyline
                key={`route-${i}`}
                positions={[[consumerLoc.lat, consumerLoc.lon], [loc.lat, loc.lon]]}
                color="#2563eb"
                dashArray="6, 8"
                weight={2}
              />
            ))
        }

        <MapUpdater 
          locations={safeLocations.filter(loc => loc && typeof loc.lat === 'number' && !isNaN(loc.lat) && typeof loc.lon === 'number' && !isNaN(loc.lon))} 
          consumerLoc={consumerLoc} 
        />
      </MapContainer>
    </div>
  );
}
