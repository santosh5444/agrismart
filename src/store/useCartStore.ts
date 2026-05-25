import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  vegetable: string;
  district: string;
  quantity: number;
  price: number;
  farmer_name: string;
  farmer_id: string;
  mobile: string;
  image?: string;
  lat?: number;
  lon?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, vegetable: string, farmer_id?: string) => void;
  updateQuantity: (id: string, vegetable: string, qty: number, farmer_id?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find(
          (i) => String(i.id) === String(item.id) && String(i.farmer_id) === String(item.farmer_id)
        );
        if (existing) {
          set({
            items: get().items.map((i) =>
              String(i.id) === String(item.id) && String(i.farmer_id) === String(item.farmer_id)
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (id, _vegetable, farmer_id) => {
        set({
          items: get().items.filter((i) => !(String(i.id) === String(id) && (farmer_id ? String(i.farmer_id) === String(farmer_id) : true))),
        });
      },
      updateQuantity: (id, _vegetable, qty, farmer_id) => {
        set({
          items: get().items.map((i) =>
            String(i.id) === String(id) && (farmer_id ? String(i.farmer_id) === String(farmer_id) : true) 
              ? { ...i, quantity: Math.max(1, qty) } 
              : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },
    }),
    { name: 'agri-cart-storage' }
  )
);
