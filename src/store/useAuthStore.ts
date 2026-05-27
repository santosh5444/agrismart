import { create } from 'zustand';
import { useCartStore } from './useCartStore';

interface UserState {
  userId: string | null;
  name: string | null;
  role: 'farmer' | 'consumer' | null;
  token: string | null;
  mobile: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  login: (data: { userId: string; name: string; role: 'farmer' | 'consumer'; token: string; mobile?: string; location?: string }) => void;
  logout: () => void;
  initialize: (routerPath?: string) => void;
  syncTab: () => void;
}

export const useAuthStore = create<UserState & AuthActions>((set) => ({
  userId: null,
  name: null,
  role: null,
  token: null,
  mobile: null,
  isInitialized: false,

  login: (data) => {
    const { userId, name, role, token, mobile, location } = data;
    
    // Clear any existing customer location data and cart to prevent cross-session pollution
    if (role === 'consumer') {
      const keys = [
        'consumer_location', 'consumer_loc_mode', 'consumer_street', 
        'consumer_city', 'consumer_district', 'consumer_pincode'
      ];
      keys.forEach(k => localStorage.removeItem(k));
      try {
        useCartStore.getState().clearCart();
      } catch (err) {
        console.error("[AuthStore] Failed to clear cart on login:", err);
      }

      // Pre-populate customer's default district/city registered at login
      if (location) {
        localStorage.setItem('consumer_location', location);
        localStorage.setItem('consumer_district', location);
      }
    }

    // Persist role-specific credentials in localStorage
    const prefix = role === 'farmer' ? 'persist_farmer_' : 'persist_consumer_';
    localStorage.setItem(`${prefix}token`, token);
    localStorage.setItem(`${prefix}role`, role);
    localStorage.setItem(`${prefix}name`, name);
    localStorage.setItem(`${prefix}userId`, userId);
    if (mobile) {
      localStorage.setItem(`${prefix}mobile`, mobile);
    } else {
      localStorage.removeItem(`${prefix}mobile`);
    }

    // Set tab-specific active session details in sessionStorage
    sessionStorage.setItem('active_role', role);
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('name', name);
    sessionStorage.setItem('userId', userId);
    if (mobile) {
      sessionStorage.setItem('mobile', mobile);
    } else {
      sessionStorage.removeItem('mobile');
    }

    set({ userId, name, role, token, mobile: mobile || null, isInitialized: true });
  },

  logout: () => {
    const activeRole = useAuthStore.getState().role;
    
    // Clear active tab session details in sessionStorage
    sessionStorage.removeItem('active_role');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('name');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('mobile');

    // Clear persistent credentials for the current role
    if (activeRole) {
      const prefix = activeRole === 'farmer' ? 'persist_farmer_' : 'persist_consumer_';
      localStorage.removeItem(`${prefix}token`);
      localStorage.removeItem(`${prefix}role`);
      localStorage.removeItem(`${prefix}name`);
      localStorage.removeItem(`${prefix}userId`);
      localStorage.removeItem(`${prefix}mobile`);
    } else {
      // Fallback: Clear all persistent credentials if role is undefined
      const keys = [
        'persist_farmer_token', 'persist_farmer_role', 'persist_farmer_name', 'persist_farmer_userId', 'persist_farmer_mobile',
        'persist_consumer_token', 'persist_consumer_role', 'persist_consumer_name', 'persist_consumer_userId', 'persist_consumer_mobile'
      ];
      keys.forEach(k => localStorage.removeItem(k));
    }

    // Clear all consumer location keys from localStorage on logout
    const consumerKeys = [
      'consumer_location', 'consumer_loc_mode', 'consumer_street', 
      'consumer_city', 'consumer_district', 'consumer_pincode'
    ];
    consumerKeys.forEach(k => localStorage.removeItem(k));

    // Clear cart via Zustand store on logout
    try {
      useCartStore.getState().clearCart();
    } catch (err) {
      console.error("[AuthStore] Failed to clear cart on logout:", err);
    }
    
    set({ userId: null, name: null, role: null, token: null, mobile: null, isInitialized: true });
  },

  initialize: (routerPath?: string) => {
    // 1. Normalize path checking. Use routerPath if available, else check hash and browser pathname.
    let checkPath = routerPath || '';
    if (!checkPath) {
      const hash = window.location.hash || '';
      if (hash.startsWith('#/')) {
        checkPath = hash.substring(1);
      } else {
        checkPath = window.location.pathname || '';
      }
    }
    // Clean query parameters and hash fragments
    checkPath = checkPath.split('?')[0].split('#')[0];
    
    console.log("[AuthStore] initialize called. routerPath:", routerPath, "checkPath:", checkPath);

    let activeRole: 'farmer' | 'consumer' | null = null;
    let activeToken: string | null = null;

    // 2. Prioritize tab-isolated sessionStorage first (survives page refreshes)
    const sessionRole = sessionStorage.getItem('active_role') as 'farmer' | 'consumer' | null;
    const sessionToken = sessionStorage.getItem('token');

    if (sessionRole && sessionToken) {
      activeRole = sessionRole;
      activeToken = sessionToken;
    } else {
      // 3. Fallback to path-based checks if no session exists in this tab
      if (checkPath.includes('/farmer') && !checkPath.includes('/login')) {
        activeRole = 'farmer';
        activeToken = localStorage.getItem('persist_farmer_token');
      } else if ((checkPath.includes('/home') || checkPath.includes('/consumer')) && !checkPath.includes('/login')) {
        activeRole = 'consumer';
        activeToken = localStorage.getItem('persist_consumer_token');
      } else {
        // 4. Fallback to localStorage check only if one role is logged in and we are not on landing page
        // (to prevent auto-login conflicts when opening a new tab to '/')
        const isLandingPage = 
          checkPath === '/' || 
          checkPath === '' || 
          checkPath === '/#/' || 
          checkPath === '/index.html' || 
          checkPath.endsWith('index.html') ||
          (!checkPath.includes('/farmer') && !checkPath.includes('/consumer') && !checkPath.includes('/home') && !checkPath.includes('/settings'));
        const isLoginPage = checkPath.includes('/login');
        if (!isLandingPage && !isLoginPage) {
          const farmerToken = localStorage.getItem('persist_farmer_token');
          const consumerToken = localStorage.getItem('persist_consumer_token');
          console.log("[AuthStore] fallback check in localStorage. farmerToken:", !!farmerToken, "consumerToken:", !!consumerToken);
          if (farmerToken && !consumerToken) {
            activeRole = 'farmer';
            activeToken = farmerToken;
          } else if (consumerToken && !farmerToken) {
            activeRole = 'consumer';
            activeToken = consumerToken;
          }
        }
      }
    }

    console.log("[AuthStore] detected activeRole:", activeRole, "activeToken exists:", !!activeToken);

    if (activeRole && activeToken) {
      const prefix = activeRole === 'farmer' ? 'persist_farmer_' : 'persist_consumer_';
      
      // Make sure sessionStorage is synced
      sessionStorage.setItem('active_role', activeRole);
      sessionStorage.setItem('token', activeToken);
      
      // Load name, userId, mobile from localStorage (fallback to sessionStorage)
      const name = localStorage.getItem(`${prefix}name`) || sessionStorage.getItem('name') || '';
      const userId = localStorage.getItem(`${prefix}userId`) || sessionStorage.getItem('userId') || '';
      const mobile = localStorage.getItem(`${prefix}mobile`) || sessionStorage.getItem('mobile') || '';

      // Sync variables back to sessionStorage
      sessionStorage.setItem('name', name);
      sessionStorage.setItem('userId', userId);
      if (mobile) {
        sessionStorage.setItem('mobile', mobile);
      }

      set({
        userId: userId || null,
        name: name || null,
        role: activeRole,
        token: activeToken,
        mobile: mobile || null,
        isInitialized: true,
      });
      return;
    }

    console.log("[AuthStore] no active session or token missing. Clearing session.");
    // Default: not logged in or no matching role found
    set({
      userId: null,
      name: null,
      role: null,
      token: null,
      mobile: null,
      isInitialized: true,
    });
  },

  syncTab: () => {
    // No-op
  }
}));
