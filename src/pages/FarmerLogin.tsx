import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Sprout, Mail, Lock, User, Phone, Loader2, ArrowRight, Leaf } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const VEGGIES = ['🌾', '🥦', '🍅', '🌽', '🌱'];

export default function FarmerLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', mobile: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = formData.email.trim();
    if (!isLogin && !identifier && !formData.mobile) {
      setError('Please provide either an Email or a Mobile Number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/farmer/login' : '/farmer/signup';
      const payload = isLogin 
        ? { email: identifier, password: formData.password }
        : { ...formData, email: identifier };

      const res = await api.post(endpoint, payload);

      if (res.data.success) {
        if (!isLogin) {
          setIsLogin(true);
          setError('Profile created! Please sign in now.');
          setFormData(prev => ({ ...prev, password: '' }));
        } else {
          login({
            userId: res.data.farmer_id,
            name: res.data.name || 'Farmer',
            role: 'farmer',
            token: res.data.token
          });
          localStorage.setItem('farmer_mobile', res.data.mobile || '');
          navigate('/farmer/details');
        }
      } else {
        setError(res.data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen relative px-4 pt-4 pb-12 overflow-hidden">
      {/* Floating emojis */}
      {VEGGIES.map((v, i) => (
        <div key={i} className="absolute text-3xl select-none pointer-events-none" style={{
          top: `${10 + i * 18}%`,
          left: i % 2 === 0 ? `${5 + i * 3}%` : `${85 - i * 2}%`,
          animation: `float ${3 + i * 0.6}s ease-in-out infinite`,
          animationDelay: `${i * 0.5}s`,
          opacity: 0.25,
          filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.5))',
        }}>{v}</div>
      ))}

      {/* Neon orbs */}
      <div className="orb orb-green w-80 h-80 -top-20 -left-20 animate-float-slow" />
      <div className="orb orb-blue w-64 h-64 -bottom-10 -right-20 animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div
          className="rounded-3xl overflow-hidden glass shadow-2xl"
          style={{
            background: 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          {/* Header */}
          <div className="relative p-8 text-center" style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.25) 0%, rgba(5,150,105,0.2) 100%)',
            borderBottom: '1px solid rgba(34,197,94,0.15)',
          }}>
            <div className="relative z-10">
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #059669)' }}
              >
                <Sprout className="w-8 h-8 text-white animate-bounce-slow" />
              </div>
              <h2 className="text-2xl font-black text-white">Farmer Portal</h2>
              <p className="text-sm text-green-300/70">Manage your harvest and reach buyers</p>
            </div>
          </div>

          <div className="p-8">
            <div className="flex p-1 rounded-xl mb-6 bg-slate-900/60 border border-white/5">
              {['Sign In', 'Sign Up'].map((tab, i) => (
                <button 
                  key={tab} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${((i === 0) === isLogin) ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'text-slate-400'}`} 
                  onClick={() => setIsLogin(i === 0)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {error && <div className={`p-3 text-sm rounded-xl mb-4 font-medium ${error.includes('created') ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {!isLogin && (
                <>
                  <div className="relative"><User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-300/60" /><input type="text" placeholder="Full Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-dark pl-10" /></div>
                  <div className="relative"><Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-300/60" /><input type="tel" placeholder="Mobile Number" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} className="input-dark pl-10" /></div>
                </>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-300/60" />
                <input type={isLogin ? "text" : "email"} placeholder={isLogin ? "Email or Mobile" : "Email Address"} required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-dark pl-10" />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-300/60" />
                <input type="password" placeholder="Password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-dark pl-10" />
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 flex items-center justify-center gap-2 mt-2 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}{isLogin ? 'Enter Portal' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
