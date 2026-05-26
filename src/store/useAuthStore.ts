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
  initialize: () => void;
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

  initialize: () => {
    // Detect active role by checking:
    // 1. Current URL path (e.g. /farmer/... vs /home or /consumer/...)
    // 2. sessionStorage active_role
    // 3. Fallback: check localStorage for which credentials exist
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    const fullPath = hash + path;

    let activeRole: 'farmer' | 'consumer' | null = null;

    if (fullPath.includes('/farmer')) {
      activeRole = 'farmer';
    } else if (fullPath.includes('/home') || fullPath.includes('/consumer')) {
      activeRole = 'consumer';
    } else {
      const sessionRole = sessionStorage.getItem('active_role') as 'farmer' | 'consumer' | null;
      if (sessionRole) {
        activeRole = sessionRole;
      } else {
        const farmerToken = localStorage.getItem('persist_farmer_token');
        const consumerToken = localStorage.getItem('persist_consumer_token');
        if (farmerToken && !consumerToken) {
          activeRole = 'farmer';
        } else if (consumerToken && !farmerToken) {
          activeRole = 'consumer';
        }
      }
    }

    if (activeRole === 'farmer') {
      const token = localStorage.getItem('persist_farmer_token');
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
