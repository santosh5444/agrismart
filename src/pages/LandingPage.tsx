import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Leaf, Star, Zap, TrendingUp, ArrowRight, Sparkles, Globe, ShoppingCart } from 'lucide-react';

const VEGGIES = [
  { emoji: '🥦', color: '#22c55e' },
  { emoji: '🍅', color: '#ef4444' },
  { emoji: '🥕', color: '#f97316' },
  { emoji: '🧅', color: '#a855f7' },
  { emoji: '🌽', color: '#eab308' },
  { emoji: '🥬', color: '#10b981' },
  { emoji: '🫑', color: '#16a34a' },
  { emoji: '🍆', color: '#7c3aed' },
  { emoji: '🥒', color: '#059669' },
  { emoji: '🌶️', color: '#dc2626' },
];

const STATS = [
  { icon: TrendingUp, label: '200+ Farmers', sub: 'Registered', color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
  { icon: Zap,        label: 'AI Predictions', sub: 'Real-time ML', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  { icon: Globe,      label: '13 Districts',   sub: 'Covered AP', color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
  { icon: Star,       label: 'Live Map',       sub: 'Track Fresh Produce', color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
];

export default function LandingPage() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-4 pt-4 pb-12">

      {/* ── Background neon orbs ───────────────────── */}
      <div className="orb orb-green w-[600px] h-[600px] -top-40 -left-40 animate-float-slow" />
      <div className="orb orb-blue  w-[500px] h-[500px] -bottom-20 -right-20 animate-float" style={{ animationDelay: '2s' }} />
      <div className="orb orb-purple w-64 h-64 top-1/3 right-1/4" />
      <div className="orb orb-amber w-48 h-48 bottom-1/4 left-1/5" style={{ opacity: 0.12 }} />

      {/* ── Animated lattice / grid decoration ─── */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        backgroundImage: `
          linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* ── Floating vegetable emojis ─────────────── */}
      {VEGGIES.map((veg, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{
            top: `${8 + (i * 9) % 75}%`,
            left: `${3 + (i * 11) % 92}%`,
            fontSize: `${1.6 + (i % 3) * 0.5}rem`,
            animation: `float ${3 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            opacity: 0.3 + (i % 3) * 0.08,
            filter: `drop-shadow(0 0 8px ${veg.color}80)`,
            transform: `rotate(${-20 + i * 8}deg)`,
          }}
        >
          {veg.emoji}
        </div>
      ))}

      {/* ── Hero Content ──────────────────────────── */}
      <div className="relative z-10 text-center max-w-4xl mx-auto animate-slide-up">

        {/* Animated badge */}
        <div
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 text-sm font-bold shimmer-line"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#86efac',
            boxShadow: '0 0 20px rgba(34,197,94,0.15)',
          }}
        >
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span>Andhra Pradesh's #1 AI Agri Platform</span>
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Central animated icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Spinning rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-36 crop-ring opacity-50" style={{ animationDuration: '12s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 crop-ring opacity-30" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
            </div>

            {/* Main icon */}
            <div
              className="relative w-24 h-24 rounded-3xl flex items-center justify-center animate-glow"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #059669, #065f46)',
                boxShadow: '0 0 40px rgba(34,197,94,0.6), 0 0 80px rgba(34,197,94,0.2)',
              }}
            >
              <Leaf className="w-12 h-12 text-white" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' }} />
            </div>

            {/* Orbit dots */}
            <div
              className="absolute w-4 h-4 bg-yellow-400 rounded-full"
              style={{
                top: '-4px', right: '-4px',
                boxShadow: '0 0 12px rgba(251,191,36,0.9)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              className="absolute w-3 h-3 bg-blue-400 rounded-full"
              style={{
                bottom: '0px', left: '-4px',
                boxShadow: '0 0 10px rgba(96,165,250,0.9)',
                animation: 'pulse 2s ease-in-out infinite 0.7s',
              }}
            />
            <div
              className="absolute w-2.5 h-2.5 bg-purple-400 rounded-full"
              style={{
                top: '50%', right: '-12px',
                boxShadow: '0 0 8px rgba(196,181,253,0.9)',
                animation: 'pulse 1.8s ease-in-out infinite 1.2s',
              }}
            />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight mb-6">
          <span className="text-white">Smart </span>
          <span className="gradient-text">Vegetable</span>
          <br />
          <span className="text-white">Market </span>
          <span className="gradient-text-gold">Platform</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-xl mx-auto mb-4 leading-relaxed" style={{ color: 'rgba(148,163,184,0.9)' }}>
          Connecting{' '}
          <strong style={{ color: '#4ade80', textShadow: '0 0 12px rgba(74,222,128,0.4)' }}>farmers</strong>
          {' '}&amp;{' '}
          <strong style={{ color: '#93c5fd', textShadow: '0 0 12px rgba(147,197,253,0.4)' }}>consumers</strong>
          {' '}across Andhra Pradesh with AI-driven price predictions and real-time availability.
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 animate-slide-up delay-200">
          {STATS.map(({ icon: Icon, label, sub, color, glow }, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-default"
              style={{
                background: 'rgba(15,23,42,0.7)',
                border: `1px solid ${color}30`,
                color: '#e2e8f0',
                boxShadow: `0 0 12px ${glow}20`,
                animationDelay: `${i * 0.1 + 0.2}s`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${glow}50`;
                (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${glow}20`;
                (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
              }}
            >
              <Icon style={{ color, filter: `drop-shadow(0 0 4px ${glow})` }} className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.75rem' }}>· {sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Login Cards ──────────────────────────────── */}
      <div className="relative z-10 grid sm:grid-cols-2 gap-10 mt-6 w-full max-w-4xl mx-auto animate-slide-up delay-300">

        {/* Farmer Card */}
        <Link
          to="/farmer/login"
          className="group relative flex flex-col items-center p-10 rounded-[2.5rem] overflow-hidden card-lift transition-all duration-500 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.2) 0%, rgba(5,150,105,0.15) 100%)',
            border: '1px solid rgba(34,197,94,0.25)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(30px)',
          }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            {['🌾', '🌱', '🌿'].map((e, i) => (
              <span key={i} className="absolute text-6xl" style={{ top: `${15 + i * 28}%`, left: `${5 + i * 32}%`, transform: `rotate(${-15 + i * 15}deg)` }}>{e}</span>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            {/* Icon */}
            <div
              className="w-24 h-24 rounded-[2rem] flex items-center justify-center mb-2 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #059669)',
                boxShadow: '0 20px 40px rgba(22,163,74,0.3)',
              }}
            >
              <Sprout className="w-12 h-12 text-white veg-bounce" />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white tracking-tight">I am a Farmer</h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-[280px]">
                List your crops, reach bulk buyers, and get fair prices.
              </p>
            </div>

            <div className="flex items-center gap-3 text-green-400 font-bold group-hover:gap-5 transition-all text-lg pt-4">
              <span>Start Selling</span>
              <ArrowRight className="w-6 h-6" />
            </div>
          </div>
        </Link>

        {/* Consumer Card */}
        <Link
          to="/consumer/login"
          className="group relative flex flex-col items-center p-12 rounded-[3.5rem] overflow-hidden card-lift transition-all duration-500 hover:scale-[1.03] active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(79,70,229,0.15) 100%)',
            border: '2px solid rgba(59,130,246,0.3)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(30px)',
          }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5 text-white">
            {['🛒', '🥗', '⚡'].map((e, i) => (
              <span key={i} className="absolute text-8xl" style={{ top: `${20 + i * 25}%`, right: `${10 + i * 30}%`, transform: `rotate(${i * 20}deg)` }}>{e}</span>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center text-center gap-10">
            {/* Icon */}
            <div
              className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-2 group-hover:-rotate-12 group-hover:scale-110 transition-all duration-500"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: '0 25px 50px rgba(37,99,235,0.4)',
              }}
            >
              <ShoppingCart className="w-14 h-14 text-white" />
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl font-black text-white tracking-widest uppercase">Consumer</h2>
              <p className="text-slate-300 text-xl leading-relaxed max-w-[320px] font-medium">
                Buy fresh from farms, track price trends, and get fast delivery.
              </p>
            </div>

            <div className="flex items-center gap-4 text-blue-400 font-black group-hover:gap-6 transition-all text-2xl pt-6 border-t border-white/10 w-full justify-center">
              <span>Start Shopping</span>
              <ArrowRight className="w-8 h-8" />
            </div>
          </div>
        </Link>
      </div>

      {/* Bottom ticker / note */}
      <p className="relative z-10 mt-10 text-xs animate-fade-in delay-600" style={{ color: 'rgba(100,116,139,0.8)' }}>
        Andhra Pradesh Agricultural Transparency Initiative · AI Price Model · Real-time Location Mapping
      </p>
    </div>
  );
}
