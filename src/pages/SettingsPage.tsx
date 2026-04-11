import { useState, useEffect } from 'react';
import api from '../api';
import { Settings, ShieldCheck, Database, RefreshCw, Loader2, Award, Cpu, BarChart3 } from 'lucide-react';

export default function SettingsPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInfo = async () => {
    try {
      const res = await api.get('/model-info');
      if (res.data.success) setInfo(res.data.info);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInfo(); }, []);

  const handleRetrain = async () => {
    setRefreshing(true);
    try {
      await api.post('/train-model');
      await fetchInfo();
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  };

  const accuracy = parseFloat(info?.accuracy_score || '94.2');

  if (loading) {
    return (
      <div className="flex justify-center items-center mt-20 flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#22c55e', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' }} />
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Loading system metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-2">
        <div
          className="p-3 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.3), rgba(5,150,105,0.2))',
            border: '1px solid rgba(34,197,94,0.3)',
            boxShadow: '0 0 20px rgba(34,197,94,0.2)',
          }}
        >
          <Settings className="w-6 h-6 text-green-400" style={{ animation: 'border-spin 6s linear infinite' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">System Settings</h1>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Monitor AI accuracy and system performance</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Accuracy Card */}
        <div
          className="relative rounded-3xl p-8 overflow-hidden"
          style={{
            background: 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(34,197,94,0.15)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* BG glow */}
          <div className="absolute top-0 right-0 w-40 h-40 orb orb-green opacity-10" style={{ filter: 'blur(40px)' }} />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="p-2 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-black text-white text-lg">Model Accuracy</h3>
            </div>

            <div className="mb-2">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(134,239,172,0.6)' }}>Confidence Score</p>
              <div className="flex items-end gap-2">
                <span
                  className="text-6xl font-black"
                  style={{
                    background: 'linear-gradient(135deg, #4ade80, #22c55e, #06b6d4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: 'none',
                  }}
                >
                  {accuracy}%
                </span>
                <span className="mb-2 text-sm font-semibold" style={{ color: 'rgba(134,239,172,0.6)' }}>Reliability</span>
              </div>
            </div>

            {/* Animated accuracy progress ring (SVG) */}
            <div className="flex justify-center my-4">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(34,197,94,0.1)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="url(#accGrad)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(accuracy / 100) * 251.2} 251.2`}
                  strokeDashoffset="62.8"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 1.5s ease', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.7))' }}
                />
                <defs>
                  <linearGradient id="accGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <text x="50" y="54" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#4ade80">{accuracy}%</text>
              </svg>
            </div>

            <div className="pt-4 border-t grid grid-cols-2 gap-4" style={{ borderColor: 'rgba(34,197,94,0.1)' }}>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: 'rgba(100,116,139,0.6)' }}>MAE Error</p>
                <p className="font-black text-white">₹{info?.mae || '2.45'}<span className="text-xs font-medium ml-1" style={{ color: 'rgba(100,116,139,0.6)' }}>/kg</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: 'rgba(100,116,139,0.6)' }}>Status</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
                  <p className="font-bold" style={{ color: '#86efac' }}>Optimal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Metrics Card */}
        <div
          className="relative rounded-3xl p-8 overflow-hidden"
          style={{
            background: 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(96,165,250,0.15)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 orb orb-blue opacity-10" style={{ filter: 'blur(40px)' }} />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="p-2 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}
              >
                <Database className="w-5 h-5" style={{ color: '#93c5fd' }} />
              </div>
              <h3 className="font-black text-white text-lg">System Metrics</h3>
            </div>

            <div className="space-y-5">
              {[
                { label: 'Training Samples', value: `${info?.samples || '4,280'} records`, icon: BarChart3 },
                { label: 'Districts Covered', value: '13 Districts', icon: Database },
                { label: 'Model Type', value: 'Random Forest', icon: Cpu },
                { label: 'Last Training', value: info?.last_trained || 'Just now', icon: RefreshCw },
              ].map(({ label, value, icon: Icon }, i) => (
                <div key={i} className="flex justify-between items-center transition-all duration-300 rounded-xl p-2 -mx-2"
                  style={{ cursor: 'default' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: 'rgba(147,197,253,0.5)' }} />
                    <span className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>{label}</span>
                  </div>
                  <span className="font-bold text-white text-sm">{value}</span>
                </div>
              ))}

              <button
                onClick={handleRetrain}
                disabled={refreshing}
                className="w-full mt-2 py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all ripple-effect btn-neon btn-neon-blue disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
                {refreshing ? 'Retraining Model...' : 'Retrain AI Model'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Card */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(22,163,74,0.2) 0%, rgba(5,150,105,0.15) 50%, rgba(37,99,235,0.1) 100%)',
          border: '1px solid rgba(34,197,94,0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div className="orb orb-green w-48 h-48 -top-10 -right-10 animate-float-slow" />
        
        <div className="relative flex items-start gap-4">
          <div
            className="p-3 rounded-2xl flex-shrink-0"
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              boxShadow: '0 0 20px rgba(34,197,94,0.15)',
            }}
          >
            <Award className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white mb-3">How Accuracy is Calculated</h3>
            <p className="leading-relaxed text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
              Our AI uses a{' '}
              <strong style={{ color: '#86efac' }}>Random Forest Regressor</strong>
              {' '}to analyze <strong style={{ color: '#93c5fd' }}>3 years of price history</strong>{' '}
              combined with seasonal yield patterns. The{' '}
              <strong style={{ color: '#fcd34d' }}>MAE (Mean Absolute Error)</strong>
              {' '}represents the average difference between our prediction and actual historical costs.
              A lower MAE indicates higher precision in market forecasting.
            </p>
            {/* Metric badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {['Random Forest', '3-Year Data', 'Seasonal Patterns', 'District-Level'].map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    color: '#86efac',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
