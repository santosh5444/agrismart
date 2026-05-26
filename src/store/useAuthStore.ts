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
    sessionStorage.setItem(`${prefix}token`, token);
    sessionStorage.setItem(`${prefix}role`, role);
    sessionStorage.setItem(`${prefix}name`, name);
    sessionStorage.setItem(`${prefix}userId`, userId);
    sessionStorage.setItem('token', token);

    set({ userId, name, role, token, isInitialized: true });
  },

  logout: () => {
    // Clear all possible keys to prevent leakage
    const keys = [
      'farmer_token', 'farmer_role', 'farmer_name', 'farmer_userId', 'farmer_mobile',
      'consumer_token', 'consumer_role', 'consumer_name', 'consumer_userId', 'consumer_mobile', 'consumer_location',
      'token'
    ];
    keys.forEach(k => sessionStorage.removeItem(k));
    
    set({ userId: null, name: null, role: null, token: null, isInitialized: true });
  },

  initialize: () => {
    const farmerToken = sessionStorage.getItem('farmer_token');
    const consumerToken = sessionStorage.getItem('consumer_token');

    if (farmerToken) {
      set({
        userId: sessionStorage.getItem('farmer_userId'),
        name: sessionStorage.getItem('farmer_name'),
        role: 'farmer',
        token: farmerToken,
        isInitialized: true,
      });
    } else if (consumerToken) {
      set({
        userId: sessionStorage.getItem('consumer_userId'),
        name: sessionStorage.getItem('consumer_name'),
        role: 'consumer',
        token: consumerToken,
        isInitialized: true,
      });
    } else {
      set({ isInitialized: true });
    }
  },

  syncTab: () => {
    // No-op since we are using sessionStorage for tab isolation
  }
}));
