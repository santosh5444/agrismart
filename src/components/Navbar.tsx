import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, LogOut, User, Settings as SettingsIcon, Sprout, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role: activeRole, token, name, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="w-full glass" style={{
      background: 'rgba(10, 20, 30, 0.6)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(34,197,94,0.15)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(34,197,94,0.1)'
    }}>
      {/* Animated neon top stripe */}
      <div
        className="h-0.5 w-full"
        style={{
          background: 'linear-gradient(90deg, #22c55e, #06b6d4, #a855f7, #f59e0b, #22c55e)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 4s linear infinite',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <Link
            to={activeRole === 'farmer' ? '/farmer/details' : '/home'}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, #16a34a, #059669)',
                  boxShadow: '0 0 20px rgba(34,197,94,0.5)',
                }}
              >
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div
                className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
                style={{ boxShadow: '0 0 8px rgba(251,191,36,0.8)', animation: 'pulse 2s ease-in-out infinite' }}
              />
            </div>
            <div>
              <span className="font-black text-xl text-white tracking-tight hidden sm:block" style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                textShadow: '0 0 20px rgba(34,197,94,0.3)'
              }}>AgriSmart</span>
              <div className="hidden sm:flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(134,239,172,0.8)' }}>AI-Powered Platform</span>
              </div>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/settings"
              className={`relative p-2.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 group ${
                location.pathname === '/settings' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
              style={location.pathname === '/settings' ? {
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
              } : { border: '1px solid transparent' }}
              title="Settings"
            >
              <SettingsIcon
                className={`w-4.5 h-4.5 ${location.pathname === '/settings' ? 'text-green-400' : ''}`}
                size={18}
              />
              <span className="hidden sm:block text-sm font-medium">Settings</span>
            </Link>

            {token && activeRole ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl badge-animated" style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                    style={{
                      background: activeRole === 'farmer'
                        ? 'linear-gradient(135deg, #16a34a, #059669)'
                        : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      boxShadow: activeRole === 'farmer'
                        ? '0 0 10px rgba(34,197,94,0.5)'
                        : '0 0 10px rgba(59,130,246,0.5)',
                    }}
                  >
                    {activeRole === 'farmer' ? <Sprout className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm leading-none">{name}</p>
                    <p className="text-[10px] font-medium capitalize mt-0.5" style={{ color: activeRole === 'farmer' ? '#86efac' : '#93c5fd' }}>{activeRole}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl group transition-all duration-300 ripple-effect"
                  style={{
                    background: 'rgba(15,23,42,0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                  }}
                  title="Logout"
                >
                  <LogOut className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" size={18} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/consumer/login" className="px-4 py-1.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>Sign In</Link>
                <Link to="/farmer/login" className="px-4 py-1.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95" style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}>Farmer Portal</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
