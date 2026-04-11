import { useState, useEffect, useRef } from 'react';
import api from '../api';
import VegetableMap from '../components/VegetableMap';
import { Search, MapPin, TrendingDown, Loader2, Sparkles, IndianRupee, ChevronDown, Star, ShoppingCart, Trash2, Plus, Minus, Package, Truck, Store as StoreIcon, X } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { calculateDistance } from '../utils/distance';

interface Recommendation { vegetable: string; district: string; lat: number; lon: number; avg_price: number; predicted_price: number; }
interface SearchResult { id?: string; farmer_name?: string; mobile?: string; land_acres?: number; vegetable: string; district: string; lat?: number; lon?: number; avg_price: number; quantity?: number; farmer_id?: string; }

const VEG_EMOJIS: Record<string, string> = {
  Tomato: '🍅', Onion: '🧅', Carrot: '🥕', Brinjal: '🍆', Capsicum: '🫑',
  Cucumber: '🥒', Cabbage: '🥬', Potato: '🥔', Corn: '🌽', Spinach: '🌿',
  Cauliflower: '🥦', Peas: '🫛', Beans: '🫘', Radish: '🔴', Ginger: '🪤',
};
const getEmoji = (name: string) => {
  const key = Object.keys(VEG_EMOJIS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? VEG_EMOJIS[key] : '🥗';
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [districts, setDistricts] = useState<{ district: string }[]>([]);
  const [vegetables, setVegetables] = useState<string[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [predVeg, setPredVeg] = useState('');
  const [predDistrict, setPredDistrict] = useState('');
  const [predPrice, setPredPrice] = useState<number | null>(null);
  const [predLoading, setPredLoading] = useState(false);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'receipt'>('cart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [consumerLoc, setConsumerLoc] = useState<{lat: number, lon: number} | null>(null);
  const [locatingConsumer, setLocatingConsumer] = useState(false);
  
  const { items, addItem, removeItem, updateQuantity, getTotal } = useCartStore();
  const { userId: currentUserId } = useAuthStore();
  const latestSearchRef = useRef({ query: '', district: '' });
  const latestRequestIdRef = useRef(0);

  const calculateTotalDeliveryFee = () => {
    if (deliveryMethod === 'pickup') return 0;
    let fee = 0;
    items.forEach(i => {
      if (consumerLoc && i.lat && i.lon) {
        const dist = calculateDistance(consumerLoc.lat, consumerLoc.lon, i.lat, i.lon) || 0;
        fee += Math.max(10, Math.floor(5 + dist * 2));
      } else { fee += 15; }
    });
    return fee;
  };

  const handleProceedCheckout = async () => {
    setIsProcessing(true);
    try {
       if (items.length === 0) { toast.error("Cart is empty"); setIsProcessing(false); return; }
       const req = { 
           user_id: currentUserId || 'guest',
           items: items.map(i => ({ product_id: String(i.id), farmer_id: String(i.farmer_id), quantity: Number(i.quantity), price_per_kg: Number(i.price) })),
           delivery_type: deliveryMethod === 'delivery' ? 'home_delivery' : 'pickup'
       };
       const res = await api.post('/farmer/checkout/validate', req);
       if (res.data.success) {
           setReceiptData({ id: 'RCPT-' + Math.floor(Math.random() * 1000000), date: new Date().toLocaleString(), delivery: deliveryMethod, total: getTotal() + calculateTotalDeliveryFee(), items: [...items] });
           setCheckoutStep('receipt');
       } else { toast.error(res.data.message || "Insufficient stock."); }
    } catch (e: any) { toast.error("Server error, try again"); }
    setIsProcessing(false);
  };

  const handleConfirmOrder = async () => {
     setIsProcessing(true);
     try {
       const req = { 
           user_id: currentUserId || 'guest',
           items: items.map(i => ({ product_id: String(i.id), farmer_id: String(i.farmer_id), quantity: Number(i.quantity), price_per_kg: Number(i.price) })),
           delivery_type: deliveryMethod === 'delivery' ? 'home_delivery' : 'pickup'
       };
       const res = await api.post('/farmer/checkout/confirm', req);
       if (res.data.success) {
           const receiptEl = document.getElementById("receipt-area");
           if (receiptEl) {
             try {
               const canvas = await html2canvas(receiptEl, { scale: 2 });
               const imgData = canvas.toDataURL('image/png');
               const pdf = new jsPDF();
               const pdfWidth = pdf.internal.pageSize.getWidth();
               const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
               pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
               pdf.save(`AgriSmart_Receipt_${Date.now()}.pdf`);
             } catch {}
           }
           toast.success("Order Confirmed! Receipt Downloaded.");
           items.forEach(i => removeItem(i.id, i.vegetable, i.farmer_id)); 
       } else { toast.error(res.data.message || "Order failed."); setCheckoutStep('cart'); }
     } catch (e: any) { toast.error("Server error occurred."); }
     setIsProcessing(false);
  };

  const handlePredict = async () => {
    if (!predVeg || !predDistrict) return;
    setPredLoading(true); setPredPrice(null);
    try {
      const now = new Date();
      const res = await api.post('/predict-price', { vegetable: predVeg, district: predDistrict, month: now.getMonth() + 1, year: now.getFullYear() });
      if (res.data.success) setPredPrice(res.data.predicted_price);
    } catch (err) { console.error(err); } finally { setPredLoading(false); }
  };

  const userLocation = localStorage.getItem('consumer_location') || 'Guntur';

  const fetchVegetables = async (query: string, district: string) => {
    const requestId = ++latestRequestIdRef.current;
    const params = new URLSearchParams();
    if (query.trim()) params.set('name', query.trim());
    if (district.trim()) params.set('district', district.trim());
    const res = await api.get(params.toString() ? `/vegetables?${params.toString()}` : '/vegetables');
    if (requestId === latestRequestIdRef.current && res.data.success) { setSearchResults(res.data.results); }
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await api.get(`/recommendations?district=${userLocation}`);
        if (res.data.success) setRecommendations(res.data.recommendations);
      } catch (err) { console.error(err); } finally { setLoadingRecs(false); }
    };
    const fetchInitialData = async () => {
      try {
        const [res, distRes] = await Promise.all([api.get('/vegetables'), api.get('/districts')]);
        if (res.data.success) setSearchResults(res.data.results);
        if (distRes.data.success) setDistricts(distRes.data.districts);
        const vegRes = await api.get('/vegetables-list');
        if (vegRes.data.success) setVegetables(vegRes.data.vegetables);
      } catch (err) { console.error(err); }
    };
    fetchRecommendations(); fetchInitialData();
  }, []);

  useEffect(() => {
    latestSearchRef.current = { query: searchQuery, district: searchDistrict };
    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try { await fetchVegetables(searchQuery, searchDistrict); } catch {}
      finally { setLoadingSearch(false); }
    }, 500);

    const pollInterval = setInterval(async () => {
      if (document.hidden) return;
      try { const { query, district } = latestSearchRef.current; await fetchVegetables(query, district); } catch {}
    }, 5000);

    return () => { clearTimeout(delayDebounceFn); clearInterval(pollInterval); };
  }, [searchQuery, searchDistrict]);

  const selectStyle = { background: 'rgba(10,15,30,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', padding: '12px 16px', width: '100%', outline: 'none', appearance: 'none' as const };

  return (
    <>
      <button 
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-28 right-8 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-[80] animate-glow-blue"
      >
        <ShoppingCart className="w-6 h-6" />
        {items.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a0f1e]">{items.reduce((acc, curr) => acc + curr.quantity, 0)}</span>}
      </button>

      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99990]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed right-0 top-0 h-full w-full max-w-md glass flex flex-col shadow-2xl z-[99999]" style={{ background: 'rgba(10,15,30,0.98)' }}>
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-blue-500/10">
                <div className="flex items-center gap-3"><ShoppingCart className="w-6 h-6 text-blue-400" /><h2 className="text-xl font-black text-white">{checkoutStep === 'receipt' ? 'Order Receipt' : 'Your Basket'}</h2></div>
                <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              {checkoutStep === 'cart' ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                    {items.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-50"><Package className="w-16 h-16 mb-4" /><p className="font-bold">Your cart is empty</p></div>
                    ) : (
                      items.map((it) => (
                        <div key={`${it.id}-${it.vegetable}`} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4">
                          <div className="text-3xl">{getEmoji(it.vegetable)}</div>
                          <div className="flex-1">
                            <div className="flex justify-between"><h4 className="font-bold text-white">{it.vegetable}</h4><button onClick={() => removeItem(it.id, it.vegetable, it.farmer_id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button></div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{it.farmer_name}</p>
                            <div className="flex justify-between items-center mt-3">
                              <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/5"><button onClick={()=>updateQuantity(it.id, it.vegetable, it.quantity-1, it.farmer_id)}><Minus className="w-3" /></button><span className="text-xs font-bold">{it.quantity}</span><button onClick={()=>updateQuantity(it.id, it.vegetable, it.quantity+1, it.farmer_id)}><Plus className="w-3" /></button></div>
                              <div className="font-black text-white">₹{it.price * it.quantity}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {items.length > 0 && (
                    <div className="p-6 border-t border-white/5 bg-white/5 space-y-4">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button onClick={() => setDeliveryMethod('delivery')} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${deliveryMethod === 'delivery' ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10'}`}><Truck className="w-5" /><span className="text-[10px] font-bold">Delivery</span></button>
                        <button onClick={() => setDeliveryMethod('pickup')} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${deliveryMethod === 'pickup' ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10'}`}><StoreIcon className="w-5" /><span className="text-[10px] font-bold">Pickup</span></button>
                      </div>
                      <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{getTotal()}</span></div>
                      <div className="flex justify-between text-sm"><span>Delivery</span><span className="text-green-400 font-bold">{deliveryMethod === 'delivery' ? `₹${calculateTotalDeliveryFee()}` : 'Free'}</span></div>
                      <div className="flex justify-between border-t border-white/10 pt-4 mb-4"><span className="text-lg font-black text-white">Total</span><span className="text-2xl font-black text-green-400">₹{getTotal() + calculateTotalDeliveryFee()}</span></div>
                      <button onClick={handleProceedCheckout} disabled={isProcessing} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 disabled:opacity-50">{isProcessing ? 'Checking stock...' : 'Checkout Now'}</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                  <div id="receipt-area" className="bg-white text-black p-6 rounded-xl shadow-lg mb-6">
                    <h3 className="text-xl font-black text-center mb-6">AgriSmart Receipt</h3>
                    <p className="text-[10px] text-slate-500 flex justify-between"><span>ID: {receiptData?.id}</span> <span>{receiptData?.date}</span></p>
                    <div className="mt-4 border-y py-4 space-y-2">
                       {receiptData?.items.map((it:any) => (<div key={it.id} className="flex justify-between text-xs"><span>{it.quantity}kg x {it.vegetable}</span><span>₹{it.price * it.quantity}</span></div>))}
                    </div>
                    <div className="mt-4 flex justify-between font-black text-lg"><span>TOTAL</span><span>₹{receiptData?.total}</span></div>
                    {receiptData?.delivery === 'pickup' && <p className="mt-4 text-[10px] text-slate-500">Please visit individual farmer locations to collect your items.</p>}
                  </div>
                  <button onClick={handleConfirmOrder} disabled={isProcessing} className="w-full py-4 rounded-2xl bg-green-500 text-white font-black hover:bg-green-400 disabled:opacity-50">{isProcessing ? <Loader2 className="animate-spin" /> : 'Confirm Order & Download'}</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="space-y-8 pb-12">
        <div className="relative overflow-hidden rounded-3xl p-8 glass" style={{ border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-green-500/20 rounded-xl"><Sparkles className="w-5 h-5 text-green-400" /></div><h2 className="text-white font-black text-xl">AI Price Predictor</h2></div>
          <div className="flex flex-wrap gap-4 items-end">
             <div className="flex-1 min-w-[150px]"><label className="text-xs font-bold uppercase block mb-1.5 text-green-300/70">Vegetable</label><select value={predVeg} onChange={e=>setPredVeg(e.target.value)} style={selectStyle}><option value="">Select...</option>{vegetables.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
             <div className="flex-1 min-w-[150px]"><label className="text-xs font-bold uppercase block mb-1.5 text-green-300/70">District</label><select value={predDistrict} onChange={e=>setPredDistrict(e.target.value)} style={selectStyle}><option value="">Select...</option>{districts.map(d=><option key={d.district} value={d.district}>{d.district}</option>)}</select></div>
             <button onClick={handlePredict} disabled={!predVeg || !predDistrict || predLoading} className="px-8 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-500 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center gap-2">
               {predLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />} Predict
             </button>
             {predPrice !== null && !predLoading && <div className="flex items-center gap-2 rounded-xl px-5 py-3 bg-green-500/10 border border-green-500/40 animate-scale-in"><IndianRupee className="w-5 text-yellow-400" /><span className="text-2xl font-black text-white">{predPrice}</span><span className="text-xs text-slate-400">/kg</span></div>}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="p-5 rounded-2xl glass border-green-500/20 shadow-xl">
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-green-400" />Find Produce</h2>
              <div className="space-y-3">
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="input-dark" />
                <select value={searchDistrict} onChange={e=>setSearchDistrict(e.target.value)} style={selectStyle} className="text-sm"><option value="">All Districts</option>{districts.map(d=><option key={d.district} value={d.district}>{d.district}</option>)}</select>
                <button onClick={() => { if(!navigator.geolocation) return; setLocatingConsumer(true); navigator.geolocation.getCurrentPosition(p=>{setConsumerLoc({lat:p.coords.latitude,lon:p.coords.longitude});setLocatingConsumer(false);toast.success('Location locked!');},()=>{setLocatingConsumer(false);toast.error('Failed to get location');}); }} className="w-full py-2 rounded-xl text-[10px] font-bold uppercase transition-all bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 flex items-center justify-center gap-2">
                  {locatingConsumer ? <Loader2 className="animate-spin w-3" /> : <MapPin className="w-3" />} {consumerLoc ? '📍 Location Locked' : '🎯 Detect Location'}
                </button>
              </div>
              <div className="mt-5 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {searchResults.slice(0, 20).map((res, i) => (
                  <div key={res.id || i} className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2"><span className="text-xl">{getEmoji(res.vegetable)}</span><div><h4 className="font-bold text-white text-xs">{res.vegetable}</h4><p className="text-[10px] text-slate-500">{res.district}</p></div></div>
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Farmer</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] mb-3"><span className="text-slate-400">Price</span><span className="font-black text-white">₹{res.avg_price}<span className="text-[9px] font-normal text-slate-500 ml-0.5">/kg</span></span></div>
                    <button onClick={() => { if(!res.id || !res.farmer_id) { toast.error("Invalid listing data"); return; } addItem({ id: res.id, vegetable: res.vegetable, district: res.district, quantity: 1, price: res.avg_price, farmer_name: res.farmer_name || 'Farmer', farmer_id: res.farmer_id, mobile: res.mobile || 'N/A', lat: res.lat, lon: res.lon }); toast.success("Added to cart!"); }} className="w-full py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100"><Plus className="w-3" /> Add to Cart</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 min-h-[500px] rounded-2xl overflow-hidden glass border-green-500/20 shadow-xl relative">
            <div className="absolute top-4 left-4 z-10 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-green-500/30 text-xs font-bold text-white flex items-center gap-2 shadow-lg"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Live Market Map</div>
            <VegetableMap locations={searchResults as any[]} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-500/20 rounded-xl"><TrendingDown className="w-5 h-5 text-blue-400" /></div><div><h2 className="text-2xl font-black text-white">Recommended Near You</h2><p className="text-sm text-slate-500 uppercase tracking-widest leading-none mt-1">AI picks for {userLocation}</p></div></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map((rec, i) => (
              <div key={i} className="p-5 rounded-2xl glass border-white/5 hover:border-green-500/30 transition-all card-lift">
                <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-2xl">{getEmoji(rec.vegetable)}</div><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1 uppercase"><Star className="w-2.5 h-2.5" /> AI Pick</span></div>
                <h3 className="font-black text-white mb-1">{rec.vegetable}</h3><p className="text-[10px] text-slate-500 flex items-center gap-1 mb-4"><MapPin className="w-2.5" /> {rec.district}</p>
                <div className="pt-3 border-t border-white/5"><p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Predicted</p><p className="text-2xl font-black text-white">₹{rec.predicted_price}<span className="text-xs font-normal text-slate-500 ml-1">/kg</span></p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
