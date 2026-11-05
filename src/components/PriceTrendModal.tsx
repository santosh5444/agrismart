import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Loader2, Sparkles, Calendar, Info, IndianRupee } from 'lucide-react';
import api from '../api';
import { getVegTelugu } from '../utils/telugu';

interface PricePoint {
  date: string;
  price: number;
}

interface TrendData {
  success: boolean;
  vegetable: string;
  district: string;
  current_price: number;
  forecast_price_30d: number;
  change_pct: number;
  trend: 'rising' | 'falling' | 'stable';
  advisory: string;
  historical: PricePoint[];
  forecast: PricePoint[];
}

interface PriceTrendModalProps {
  vegetable: string;
  district: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PriceTrendModal({ vegetable, district, isOpen, onClose }: PriceTrendModalProps) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; price: number; type: 'historical' | 'forecast' } | null>(null);

  useEffect(() => {
    if (!isOpen || !vegetable || !district) return;
    setLoading(true);
    setHoveredPoint(null);

    api.get(`/price-trends?vegetable=${encodeURIComponent(vegetable)}&district=${encodeURIComponent(district)}`)
      .then(res => {
        if (res.data.success) {
          setData(res.data);
        }
      })
      .catch(err => console.error("Failed to load price trends:", err))
      .finally(() => setLoading(false));
  }, [isOpen, vegetable, district]);

  if (!isOpen) return null;

  // Chart coordinate calculations
  const allPoints = data ? [...data.historical, ...data.forecast] : [];
  const prices = allPoints.map(p => p.price);
  const minPrice = prices.length ? Math.max(0, Math.floor(Math.min(...prices) * 0.9)) : 0;
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices) * 1.1) : 100;
  const priceRange = maxPrice - minPrice || 1;

  const chartWidth = 600;
  const chartHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const getX = (index: number, total: number) => padLeft + (index / (total - 1 || 1)) * plotWidth;
  const getY = (price: number) => padTop + plotHeight - ((price - minPrice) / priceRange) * plotHeight;

  // Build SVG path strings
  const histPoints = data?.historical || [];
  const forePoints = data?.forecast || [];
  const totalPoints = histPoints.length + forePoints.length;

  let histPath = '';
  if (histPoints.length > 0) {
    histPath = histPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, totalPoints).toFixed(1)} ${getY(p.price).toFixed(1)}`).join(' ');
  }

  let forePath = '';
  if (forePoints.length > 0 && histPoints.length > 0) {
    const lastHist = histPoints[histPoints.length - 1];
    const startIndex = histPoints.length - 1;
    forePath = `M ${getX(startIndex, totalPoints).toFixed(1)} ${getY(lastHist.price).toFixed(1)} ` +
      forePoints.map((p, i) => `L ${getX(startIndex + 1 + i, totalPoints).toFixed(1)} ${getY(p.price).toFixed(1)}`).join(' ');
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div 
        className="w-full max-w-2xl bg-[#0d1424] border border-blue-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-scale-in custom-scrollbar max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(59, 130, 246, 0.15)' }}
      >
        {/* Background glow accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-white">{vegetable}</h2>
                {getVegTelugu(vegetable) && (
                  <span className="text-lg text-green-400 font-bold">({getVegTelugu(vegetable)})</span>
                )}
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold border border-white/10">
                📍 {district}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">30-Day Historical Actuals + 30-Day AI Future Price Projection</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Computing historical data & AI predictions...</p>
          </div>
        ) : !data ? (
          <div className="py-16 text-center text-slate-400">Failed to load trend data.</div>
        ) : (
          <div className="space-y-6">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Market</span>
                <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1">
                  <span>₹{data.current_price}</span>
                  <span className="text-[10px] text-slate-400 font-normal">/kg</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">30-Day Forecast</span>
                <div className="text-2xl font-black text-green-400 mt-1 flex items-baseline gap-1">
                  <span>₹{data.forecast_price_30d}</span>
                  <span className="text-[10px] text-slate-400 font-normal">/kg</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expected Trend</span>
                <div className="text-lg font-black mt-1 flex items-center gap-1.5">
                  {data.trend === 'rising' ? (
                    <span className="text-green-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> +{data.change_pct}%
                    </span>
                  ) : data.trend === 'falling' ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" /> {data.change_pct}%
                    </span>
                  ) : (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Minus className="w-4 h-4" /> Stable
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/5 p-4 relative">
              <div className="flex items-center justify-between text-xs mb-2 px-2 text-slate-400 font-medium">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" /> Past 30 Days (Actual)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-green-400 inline-block" /> Next 30 Days (AI Forecast)
                  </span>
                </div>
                {hoveredPoint && (
                  <div className="text-[11px] font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-white/10 animate-fade-in">
                    {hoveredPoint.date}: <span className="text-green-400">₹{hoveredPoint.price}/kg</span> ({hoveredPoint.type})
                  </div>
                )}
              </div>

              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-auto overflow-visible select-none"
              >
                {/* Horizontal price gridlines */}
                {[0, 0.33, 0.66, 1].map((pct, idx) => {
                  const pVal = Math.round(minPrice + (1 - pct) * priceRange);
                  const y = padTop + pct * plotHeight;
                  return (
                    <g key={idx}>
                      <line 
                        x1={padLeft} 
                        y1={y} 
                        x2={chartWidth - padRight} 
                        y2={y} 
                        stroke="rgba(255,255,255,0.06)" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={padLeft - 8} 
                        y={y + 4} 
                        fill="rgba(148, 163, 184, 0.7)" 
                        fontSize="10" 
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        ₹{pVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical "Today" divider line */}
                {histPoints.length > 0 && (
                  <g>
                    <line 
                      x1={getX(histPoints.length - 1, totalPoints)} 
                      y1={padTop} 
                      x2={getX(histPoints.length - 1, totalPoints)} 
                      y2={padTop + plotHeight} 
                      stroke="rgba(255, 255, 255, 0.25)" 
                      strokeDasharray="3 3"
                    />
                    <text 
                      x={getX(histPoints.length - 1, totalPoints)} 
                      y={chartHeight - 8} 
                      fill="#93c5fd" 
                      fontSize="9" 
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      TODAY
                    </text>
                  </g>
                )}

                {/* Actual Historical Line */}
                {histPath && (
                  <path 
                    d={histPath} 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                )}

                {/* Forecast Line */}
                {forePath && (
                  <path 
                    d={forePath} 
                    fill="none" 
                    stroke="#22c55e" 
                    strokeWidth="2.5" 
                    strokeDasharray="5 5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                )}

                {/* Interactive Points on hover */}
                {histPoints.map((p, i) => (
                  <circle
                    key={`hist-${i}`}
                    cx={getX(i, totalPoints)}
                    cy={getY(p.price)}
                    r={hoveredPoint?.date === p.date ? "5" : "3"}
                    fill={hoveredPoint?.date === p.date ? "#60a5fa" : "#3b82f6"}
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredPoint({ date: p.date, price: p.price, type: 'historical' })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {forePoints.map((p, i) => (
                  <circle
                    key={`fore-${i}`}
                    cx={getX(histPoints.length + i, totalPoints)}
                    cy={getY(p.price)}
                    r={hoveredPoint?.date === p.date ? "5" : "3"}
                    fill={hoveredPoint?.date === p.date ? "#4ade80" : "#22c55e"}
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredPoint({ date: p.date, price: p.price, type: 'forecast' })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* Date axis labels */}
                {histPoints.length > 0 && (
                  <text x={padLeft} y={chartHeight - 8} fill="rgba(148, 163, 184, 0.6)" fontSize="9" textAnchor="start">
                    -30 Days
                  </text>
                )}
                {forePoints.length > 0 && (
                  <text x={chartWidth - padRight} y={chartHeight - 8} fill="rgba(148, 163, 184, 0.6)" fontSize="9" textAnchor="end">
                    +30 Days
                  </text>
                )}
              </svg>
            </div>

            {/* AI Agricultural Advisory */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex gap-3.5 items-start">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 mt-0.5">
                <Info className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">AI Market Advisory</h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">{data.advisory}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
