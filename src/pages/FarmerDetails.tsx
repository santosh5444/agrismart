import { useState, useEffect } from 'react';
import api from '../api';
import { PackageOpen, MapPin, Scale, Plus, Loader2, Navigation, CheckCircle2, Sprout, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceAssistant from '../components/VoiceAssistant';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';

export default function FarmerDetails() {
  const [districts, setDistricts] = useState<{ district: string }[]>([]);
  const [vegetables, setVegetables] = useState<string[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({ district: '', vegetable: '', quantity: '', price: '', street: '', city: '', pincode: '' });
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [checkingPrice, setCheckingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();

  const { userId: farmerId, name: farmerName } = useAuthStore();
  const farmerMobile = localStorage.getItem('farmer_mobile') || '';
  const farmerQuery = new URLSearchParams();
  if (farmerId) farmerQuery.set('farmer_id', farmerId);
  if (farmerMobile) farmerQuery.set('mobile', farmerMobile);
  const farmerCropsEndpoint = `/farmer/crops?${farmerQuery.toString()}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [distRes, vegRes, cropsRes] = await Promise.all([
          api.get('/districts'),
          api.get('/vegetables-list'),
          api.get(farmerCropsEndpoint),
        ]);
        if (distRes.data.success) setDistricts(distRes.data.districts);
        if (vegRes.data.success) setVegetables(vegRes.data.vegetables);
        if (cropsRes.data.success) {
          const fetchedCrops = cropsRes.data.crops;
          setCrops(fetchedCrops);
          
          const now = new Date();
          const preds: Record<string, number> = {};
          await Promise.all(fetchedCrops.map(async (c: any) => {
            try {
              const pRes = await api.post('/predict-price', {
                vegetable: c.vegetable, district: c.district, month: now.getMonth() + 1, year: now.getFullYear()
              });
              if (pRes.data.success) preds[c.id] = pRes.data.predicted_price;
            } catch {}
          }));
          setPredictions(preds);
        }
      } catch (err) { console.error(err); }
      finally { setFetching(false); }
    };
    loadData();

    const pollInterval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await api.get(farmerCropsEndpoint);
        if (res.data.success) {
          setCrops((prev) => JSON.stringify(prev) === JSON.stringify(res.data.crops) ? prev : res.data.crops);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [farmerCropsEndpoint]);

  useEffect(() => {
    const fetchPrediction = async () => {
      if (formData.district && formData.vegetable) {
        setCheckingPrice(true);
        try {
          const now = new Date();
          const res = await api.post('/predict-price', { vegetable: formData.vegetable, district: formData.district, month: now.getMonth() + 1, year: now.getFullYear() });
          if (res.data.success) setPredictedPrice(res.data.predicted_price);
        } catch {} finally { setCheckingPrice(false); }
      } else { setPredictedPrice(null); }
    };
    fetchPrediction();
  }, [formData.district, formData.vegetable]);

  useEffect(() => {
    if (predictedPrice !== null && formData.price) {
      const p = parseFloat(formData.price);
      if (p < predictedPrice - 10 || p > predictedPrice + 10) {
        setPriceError(`⚠️ Price must be within ₹10 of prediction (₹${(predictedPrice-10).toFixed(0)}-₹${(predictedPrice+10).toFixed(0)})`);
      } else { setPriceError(null); }
    } else { setPriceError(null); }
  }, [formData.price, predictedPrice]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      setLocation({ lat, lon });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        setFormData(p => ({ ...p, city: data.address?.city || data.address?.town || p.city, pincode: data.address?.postcode || p.pincode, street: data.address?.road || p.street, district: data.address?.state_district || p.district }));
      } catch {}
      setLocating(false);
      toast.success("Location locked!");
    }, () => setLocating(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (priceError) return;
    setLoading(true);
    try {
      const res = await api.post('/farmer/details', { farmer_id: farmerId, name: farmerName, mobile: farmerMobile, district: formData.district, vegetable: formData.vegetable, quantity: parseFloat(formData.quantity), price: parseFloat(formData.price), street: formData.street, city: formData.city, pincode: formData.pincode, lat: location?.lat, lon: location?.lon });
      if (res.data.success) {
        setCrops([...crops, res.data.entry]);
        setFormData({ district: '', vegetable: '', quantity: '', price: '', street: '', city: '', pincode: '' });
        setLocation(null);
        toast.success("Crop listed successfully! 🌾");
      }
    } catch { toast.error("Server error"); } finally { setLoading(false); }
  };

  const handleVoiceCommand = (res: any) => {
    if (res.intent === 'add_crop') {
      const { vegetable, quantity, district, price } = res.data;
      const matchedVeg = vegetables.find(v => v.toLowerCase() === vegetable?.toLowerCase()) || vegetable;
      const matchedDist = districts.find(d => d.district.toLowerCase() === district?.toLowerCase())?.district || district;
      setFormData(prev => ({ ...prev, vegetable: matchedVeg || prev.vegetable, quantity: quantity || prev.quantity, district: matchedDist || prev.district, price: price || prev.price }));
      toast.success("Voice Data Applied!");
    } else if (res.intent === 'navigate') { navigate(res.data.path); }
  };

  const handleDelete = async (cropId: string) => {
    try {
      const res = await api.delete(`/farmer/crops/${cropId}?${farmerQuery.toString()}`);
      if (res.data.success) { setCrops(crops.filter(c => c.id !== cropId)); toast.success("Listing deleted."); }
    } catch { toast.error("Error deleting"); }
  };

  const handleUpdate = async (cropId: string, diff: {price?: number, quantity?: number}) => {
    const currentCrop = crops.find(c => c.id === cropId);
    if (!currentCrop) return;
    const req = { ...currentCrop, ...diff, farmer_id: farmerId };
    try {
      const res = await api.put(`/farmer/crops/${cropId}`, req);
      if (res.data.success) { setCrops(prev => prev.map(c => c.id === cropId ? { ...c, ...res.data.entry, id: cropId } : c)); }
    } catch { toast.error("Sync error"); }
  };

  const selectStyle = { background: 'rgba(10,15,30,0.8)', border: '1px solid rgba(34,197,94,0.2)', color: 'white', borderRadius: '10px', padding: '10px 14px', width: '100%', outline: 'none' };

  if (fetching) return <div className="flex flex-col items-center mt-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-green-500" /><p className="text-sm text-slate-500">Loading profile...</p></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <div className="flex items-center gap-4 mb-2"><div className="p-3 rounded-2xl glass border-green-500/30 shadow-lg"><Sprout className="w-6 h-6 text-green-400" /></div><div><h1 className="text-2xl font-black text-white">Farmer Dashboard</h1><p className="text-sm text-slate-500">Manage harvest and prices</p></div></div>

      <div className="rounded-3xl glass border-green-500/20 overflow-hidden shadow-2xl">
        <div className="p-6 bg-green-500/5 border-b border-green-500/10 flex items-center gap-3"><Plus className="w-5 text-green-400" /><h2 className="text-lg font-black text-white">Add Crop Availability</h2></div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid md:grid-cols-4 gap-5">
            <div className="space-y-2"><label className="text-sm font-bold flex items-center gap-1.5 text-green-300/80"><MapPin className="w-4" /> District</label><select required value={formData.district} onChange={e=>setFormData({...p=formData, district: e.target.value})} style={selectStyle}><option value="">Select...</option>{districts.map(d=><option key={d.district} value={d.district}>{d.district}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-bold flex items-center gap-1.5 text-green-300/80"><PackageOpen className="w-4" /> Vegetable</label><select required value={formData.vegetable} onChange={e=>setFormData({...formData, vegetable: e.target.value})} style={selectStyle}><option value="">Select...</option>{vegetables.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-bold flex items-center gap-1.5 text-green-300/80"><Scale className="w-4" /> Quantity (kg)</label><input type="number" required min="1" value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} className="input-dark" /></div>
            <div className="space-y-2"><label className="text-sm font-bold flex items-center gap-1.5 text-green-300/80"><IndianRupee className="w-4" /> Price (₹/kg)</label><input type="number" required min="1" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className={`input-dark ${priceError ? 'border-red-500' : ''}`} /></div>
          </div>
          {priceError && <p className="text-[10px] text-red-400 mt-1">{priceError}</p>}
          <button type="button" onClick={()=>setShowAdvanced(!showAdvanced)} className="mt-4 text-[10px] font-bold uppercase tracking-widest text-green-500/60 hover:text-green-400">{showAdvanced ? '− Hide Address' : '+ Add Address'}</button>
          {showAdvanced && <div className="grid md:grid-cols-3 gap-5 mt-4 animate-scale-in">
            <input type="text" placeholder="Street" value={formData.street} onChange={e=>setFormData({...formData, street: e.target.value})} className="input-dark" />
            <input type="text" placeholder="City" value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} className="input-dark" />
            <input type="text" placeholder="Pincode" value={formData.pincode} onChange={e=>setFormData({...formData, pincode: e.target.value})} className="input-dark" />
          </div>}

          {formData.district && formData.vegetable && (
            <div className="mt-5 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex justify-between items-center text-center">
              <div className="text-left"><h4 className="font-bold text-white text-sm">AI Market Prediction</h4><p className="text-[10px] text-blue-200/60">Based on recent trends in {formData.district}</p></div>
              {checkingPrice ? <Loader2 className="animate-spin text-blue-400" /> : <div className="text-2xl font-black text-blue-400">₹{predictedPrice?.toFixed(1)}<span className="text-xs ml-1">/kg</span></div>}
            </div>
          )}

          <div className="mt-5 p-4 rounded-2xl glass border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3"><Navigation className="w-5 text-green-400" /><div><h4 className="font-bold text-white text-sm">GPS Location</h4><p className="text-[10px] text-slate-500">{location ? 'Locked and Verified' : 'Required for consumer map'}</p></div></div>
            <button type="button" onClick={handleGetLocation} className="px-4 py-2 rounded-xl text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">{locating ? <Loader2 className="animate-spin" /> : location ? '📍 Locked' : 'Get GPS'}</button>
          </div>
          <button type="submit" disabled={loading || !!priceError} className="w-full mt-6 py-4 rounded-2xl font-black text-white bg-green-600 hover:bg-green-500 shadow-xl shadow-green-600/20 disabled:opacity-50 flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" /> : <Plus />} List Harvest</button>
        </form>
      </div>

      <div className="flex justify-center -my-2 mb-4"><VoiceAssistant onCommand={handleVoiceCommand} contextDistrict={formData.district || 'Guntur'} /></div>

      <div className="rounded-3xl glass border-green-500/20 shadow-2xl overflow-hidden">
        <div className="p-6 bg-green-500/5 border-b border-green-500/10 flex justify-between items-center"><h2 className="text-lg font-black text-white flex items-center gap-2"><PackageOpen className="w-5 text-green-400" /> Your Active Listings</h2><span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-[10px] font-bold text-green-400 rounded-full">{crops.length} Listed</span></div>
        <div className="divide-y divide-white/5">
          {crops.length === 0 ? <div className="p-16 text-center opacity-30"><p>No crops listed.</p></div> : crops.map((c, i) => (
            <div key={c.id || i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-all">
              <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center font-black text-green-400">{c.vegetable[0]}</div><div><h3 className="font-bold text-white text-sm">{c.vegetable}</h3><p className="text-[10px] text-slate-500">📍 {c.district}</p></div></div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <div className="flex border border-yellow-500/30 rounded-full overflow-hidden text-[10px] font-bold"><span className="px-3 py-1 bg-yellow-500/10 text-yellow-300">₹{c.price}/kg</span><button onClick={()=>handleUpdate(c.id, {price: c.price+1})} className="px-2 bg-yellow-500/20">+</button><button onClick={()=>handleUpdate(c.id, {price: Math.max(1, c.price-1)})} className="px-2 bg-yellow-500/20">-</button></div>
                  <div className="flex border border-green-500/30 rounded-full overflow-hidden text-[10px] font-bold"><span className="px-3 py-1 bg-green-500/10 text-green-400">{c.quantity}kg</span><button onClick={()=>handleUpdate(c.id, {quantity: c.quantity+1})} className="px-2 bg-green-500/20">+</button><button onClick={()=>handleUpdate(c.id, {quantity: Math.max(1, c.quantity-1)})} className="px-2 bg-green-500/20">-</button></div>
                </div>
                <button onClick={()=>handleDelete(c.id)} className="text-[10px] text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
