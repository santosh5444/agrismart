import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom green marker
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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
}

function MapUpdater({ locations }: { locations: MapProps['locations'] }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lon]));
      // Zoom in closer if there's only 1 very specific location
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: locations.length === 1 ? 14 : 10 });
    } else {
      // Reset view to Andhra Pradesh if no results
      map.setView([15.9129, 79.7400], 6);
    }
  }, [locations, map]);

  return null;
}

export default function VegetableMap({ locations }: MapProps) {
  // Center of Andhra Pradesh
  const center: [number, number] = [15.9129, 79.7400];

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner rtl" style={{isolation: 'isolate'}}>
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
        {locations.map((loc, i) => (
          <Marker 
            key={`${loc.district}-${loc.vegetable}-${i}`} 
            position={[loc.lat, loc.lon]}
            icon={greenIcon}
          >
            <Popup className="rounded-lg">
              <div className="font-sans min-w-[150px]">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-agri-900 leading-tight">{loc.vegetable}</h3>
                  {loc.type === 'Farmer' && (
                    <span className="bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Farmer</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {loc.district}
                </p>
                
                {loc.type === 'Farmer' ? (
                  <div className="border-t border-gray-100 pt-2 space-y-1">
                    <p className="text-[11px] text-gray-600 font-medium">Seller: {loc.farmer_name}</p>
                    <p className="text-[11px] text-agri-600 font-bold">Call: {loc.mobile}</p>
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
        <MapUpdater locations={locations} />
      </MapContainer>
    </div>
  );
}
