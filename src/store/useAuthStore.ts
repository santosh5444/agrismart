import { create } from 'zustand';

interface UserState {
  userId: string | null;
  name: string | null;
  role: 'farmer' | 'consumer' | null;
  token: string | null;
  mobile: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  login: (data: { userId: string; name: string; role: 'farmer' | 'consumer'; token: string; mobile?: string }) => void;
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
    const { userId, name, role, token, mobile } = data;
    
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

    set({ userId, name, role, token, mobile: mobile || null, isInitialized: true });
  },

  logout: () => {
    const activeRole = useAuthStore.getState().role;
    
    // Clear active tab session
    sessionStorage.removeItem('active_role');
    sessionStorage.removeItem('token');

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
    
    set({ userId: null, name: null, role: null, token: null, mobile: null, isInitialized: true });
  },

  initialize: (routerPath?: string) => {
    const hash = window.location.hash || '';
    const winPath = window.location.pathname || '';
    
    // Normalize path checking. Use routerPath if available, combined with hash and pathname.
    const checkPath = (routerPath || '') + hash + winPath;
    
    console.log("[AuthStore] initialize called. routerPath:", routerPath, "hash:", hash, "winPath:", winPath, "checkPath:", checkPath);

    let activeRole: 'farmer' | 'consumer' | null = null;

    if (checkPath.includes('/farmer')) {
      activeRole = 'farmer';
    } else if (checkPath.includes('/home') || checkPath.includes('/consumer')) {
      activeRole = 'consumer';
    } else {
      const sessionRole = sessionStorage.getItem('active_role') as 'farmer' | 'consumer' | null;
      if (sessionRole) {
        activeRole = sessionRole;
      } else {
        const farmerToken = localStorage.getItem('persist_farmer_token');
        const consumerToken = localStorage.getItem('persist_consumer_token');
        console.log("[AuthStore] fallback check in localStorage. farmerToken:", !!farmerToken, "consumerToken:", !!consumerToken);
        if (farmerToken && !consumerToken) {
          activeRole = 'farmer';
        } else if (consumerToken && !farmerToken) {
          activeRole = 'consumer';
        }
      }
    }

    console.log("[AuthStore] detected activeRole:", activeRole);

    if (activeRole === 'farmer') {
      const token = localStorage.getItem('persist_farmer_token');
      console.log("[AuthStore] restoring farmer session. Token exists:", !!token);
      if (token) {
        sessionStorage.setItem('active_role', 'farmer');
        sessionStorage.setItem('token', token);
        set({
          userId: localStorage.getItem('persist_farmer_userId'),
          name: localStorage.getItem('persist_farmer_name'),
          role: 'farmer',
          token: token,
          mobile: localStorage.getItem('persist_farmer_mobile'),
          isInitialized: true,
        });
        return;
      }
    } else if (activeRole === 'consumer') {
      const token = localStorage.getItem('persist_consumer_token');
      console.log("[AuthStore] restoring consumer session. Token exists:", !!token);
      if (token) {
        sessionStorage.setItem('active_role', 'consumer');
        sessionStorage.setItem('token', token);
        set({
          userId: localStorage.getItem('persist_consumer_userId'),
          name: localStorage.getItem('persist_consumer_name'),
          role: 'consumer',
          token: token,
          mobile: localStorage.getItem('persist_consumer_mobile'),
          isInitialized: true,
        });
        return;
      }
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
