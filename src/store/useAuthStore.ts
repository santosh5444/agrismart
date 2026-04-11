import { create } from 'zustand';

interface UserState {
  userId: string | null;
  name: string | null;
  role: 'farmer' | 'consumer' | null;
  token: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  login: (data: { userId: string; name: string; role: 'farmer' | 'consumer'; token: string }) => void;
  logout: () => void;
  initialize: () => void;
  syncTab: () => void;
}

export const useAuthStore = create<UserState & AuthActions>((set) => ({
  userId: null,
  name: null,
  role: null,
  token: null,
  isInitialized: false,

  login: (data) => {
    const { userId, name, role, token } = data;
    
    // Set role-specific keys and a generic token for the API interceptor
    const prefix = role === 'farmer' ? 'farmer_' : 'consumer_';
    localStorage.setItem(`${prefix}token`, token);
    localStorage.setItem(`${prefix}role`, role);
    localStorage.setItem(`${prefix}name`, name);
    localStorage.setItem(`${prefix}userId`, userId);
    localStorage.setItem('token', token);

    set({ userId, name, role, token, isInitialized: true });
  },

  logout: () => {
    // Clear all possible keys to prevent leakage
    const keys = [
      'farmer_token', 'farmer_role', 'farmer_name', 'farmer_userId', 'farmer_mobile',
      'consumer_token', 'consumer_role', 'consumer_name', 'consumer_userId', 'consumer_mobile', 'consumer_location',
      'token'
    ];
    keys.forEach(k => localStorage.removeItem(k));
    
    set({ userId: null, name: null, role: null, token: null, isInitialized: true });
  },

  initialize: () => {
    const farmerToken = localStorage.getItem('farmer_token');
    const consumerToken = localStorage.getItem('consumer_token');

    if (farmerToken) {
      set({
        userId: localStorage.getItem('farmer_userId'),
        name: localStorage.getItem('farmer_name'),
        role: 'farmer',
        token: farmerToken,
        isInitialized: true,
      });
    } else if (consumerToken) {
      set({
        userId: localStorage.getItem('consumer_userId'),
        name: localStorage.getItem('consumer_name'),
        role: 'consumer',
        token: consumerToken,
        isInitialized: true,
      });
    } else {
      set({ isInitialized: true });
    }
  },

  syncTab: () => {
    const farmerToken = localStorage.getItem('farmer_token');
    const consumerToken = localStorage.getItem('consumer_token');
    
    if (!farmerToken && !consumerToken) {
      set({ userId: null, name: null, role: null, token: null });
    } else {
      const role = farmerToken ? 'farmer' : 'consumer';
      const prefix = role === 'farmer' ? 'farmer_' : 'consumer_';
      const token = farmerToken || consumerToken;
      
      set({
        userId: localStorage.getItem(`${prefix}userId`),
        name: localStorage.getItem(`${prefix}name`),
        role: role as any,
        token: token,
      });
    }
  }
}));
