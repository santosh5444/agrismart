import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loaded page components to reduce initial bundle size
const LandingPage = lazy(() => import('./pages/LandingPage'));
const FarmerLogin = lazy(() => import('./pages/FarmerLogin'));
const ConsumerLogin = lazy(() => import('./pages/ConsumerLogin'));
const FarmerDetails = lazy(() => import('./pages/FarmerDetails'));
const HomePage = lazy(() => import('./pages/HomePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Fallback loader for suspense instances
const PageLoader = () => (
  <div className="flex-1 flex justify-center items-center py-20 min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-green-500 shadow-green-500/50" />
      <span className="text-sm text-slate-400 font-medium tracking-wide">Loading Page...</span>
    </div>
  </div>
);

function App() {
  const { role: currentRole, token: currentToken, isInitialized, initialize } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Migration: Clear old localStorage auth keys to prevent session leakage from old builds
    const legacyKeys = [
      'farmer_token', 'farmer_role', 'farmer_name', 'farmer_userId', 'farmer_mobile',
      'consumer_token', 'consumer_role', 'consumer_name', 'consumer_userId', 'consumer_mobile', 'consumer_location',
      'token'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  }, []);

  useEffect(() => {
    console.log("[App] Router path change detected. path:", location.pathname, "hash:", location.hash);
    initialize(location.pathname);
  }, [location.pathname, location.hash, initialize]);

  if (!isInitialized) {
    return <PageLoader />;
  }

  const ProtectedRoute = ({ children, allowedRole }: { children: JSX.Element, allowedRole: string }) => {
    if (!currentToken) return <Navigate to="/" replace />;
    if (currentRole !== allowedRole) return <Navigate to="/" replace />;
    return children;
  };

  const fallbackPath = currentRole === 'farmer' ? '/farmer/details' : currentRole === 'consumer' ? '/home' : '/';

  return (
    <div className="min-h-screen relative z-10 flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-[1000]">
        <Navbar />
      </header>
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/farmer/login" element={<FarmerLogin />} />
            <Route path="/consumer/login" element={<ConsumerLogin />} />
            
            <Route 
              path="/farmer/details" 
              element={
                <ProtectedRoute allowedRole="farmer">
                  <FarmerDetails />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/home" 
              element={
                <ProtectedRoute allowedRole="consumer">
                  <HomePage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/settings" 
              element={<SettingsPage />} 
            />

            <Route path="*" element={<Navigate to={fallbackPath} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </main>
      <Chatbot />
      <Toaster position="top-center" toastOptions={{ style: { zIndex: 9999999 } }} containerStyle={{ zIndex: 9999999 }} />
    </div>
  );
}

export default App;
