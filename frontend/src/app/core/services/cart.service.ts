import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  productId: number | string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CartState {
  storeId: number | string | null;
  storeName: string;
  items: CartItem[];
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly STORAGE_KEY = 'ordarat_active_cart';

  private readonly state = signal<CartState>(this.loadCartFromStorage());

  readonly cart = this.state.asReadonly();

  readonly storeId = computed(() => this.state().storeId);
  readonly storeName = computed(() => this.state().storeName);
  readonly items = computed(() => this.state().items);

  readonly itemsCount = computed(() => 
    this.state().items.reduce((acc, item) => acc + item.quantity, 0)
  );

  readonly itemsTotal = computed(() => 
    this.state().items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  );

  constructor() {}

  /**
   * Add product to cart. Enforces single-store cart policy.
   * Returns false if item belongs to another store and user confirmation is required.
   */
  addItem(storeId: number | string, storeName: string, product: { id: number | string; name: string; price: number; image_url?: string }): { success: boolean; conflictStore?: string } {
    const current = this.state();

    if (current.storeId !== null && current.storeId !== storeId && current.items.length > 0) {
      return { success: false, conflictStore: current.storeName };
    }

    const existingIndex = current.items.findIndex(i => i.productId === product.id);
    let updatedItems: CartItem[];

    if (existingIndex > -1) {
      updatedItems = current.items.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedItems = [
        ...current.items,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.image_url
        }
      ];
    }

    const newState: CartState = {
      storeId,
      storeName,
      items: updatedItems,
      notes: current.notes
    };

    this.saveState(newState);
    return { success: true };
  }

  updateQuantity(productId: number | string, delta: number): void {
    const current = this.state();
    const updatedItems = current.items
      .map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null);

    const newState: CartState = {
      ...current,
      storeId: updatedItems.length > 0 ? current.storeId : null,
      storeName: updatedItems.length > 0 ? current.storeName : '',
      items: updatedItems
    };

    this.saveState(newState);
  }

  clearCart(): void {
    const empty: CartState = {
      storeId: null,
      storeName: '',
      items: [],
      notes: ''
    };
    this.saveState(empty);
  }

  /**
   * Preserves cart across login/logout cycles in LocalStorage.
   */
  private loadCartFromStorage(): CartState {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore storage error
    }
    return { storeId: null, storeName: '', items: [], notes: '' };
  }

  private saveState(newState: CartState): void {
    this.state.set(newState);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // Ignore storage write error
    }
  }
}
