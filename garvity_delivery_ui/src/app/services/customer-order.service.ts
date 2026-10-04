import { Injectable, computed, signal } from '@angular/core';
import { CurrencyCode, ProductType } from './restaurant-owner-data.service';
import { Restaurant } from './home-data.service';

export type OrderProduct = {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  currency: CurrencyCode;
  description: string;
  available: boolean;
};

export type OrderMenu = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  products: OrderProduct[];
};

export type OrderCartItem = {
  id: string;
  kind: 'menu' | 'product';
  name: string;
  price: number;
  currency: CurrencyCode;
  quantity: number;
};

@Injectable({
  providedIn: 'root',
})
export class CustomerOrderService {
  private readonly selectedRestaurantStorageKey = 'gravity-selected-restaurant';

  readonly selectedRestaurant = signal<Restaurant | null>(this.readStoredSelectedRestaurant());
  readonly cartItems = signal<OrderCartItem[]>([]);
  readonly cartTotal = computed(() =>
    this.cartItems().reduce((total, item) => total + item.price * item.quantity, 0),
  );
  readonly cartQuantity = computed(() =>
    this.cartItems().reduce((total, item) => total + item.quantity, 0),
  );

  selectRestaurant(restaurant: Restaurant): void {
    this.selectedRestaurant.set(restaurant);
    this.writeStoredSelectedRestaurant(restaurant);
    this.cartItems.set([]);
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  addMenu(menu: OrderMenu): void {
    this.upsertCartItem({
      id: menu.id,
      kind: 'menu',
      name: menu.name,
      price: menu.price,
      currency: menu.currency,
      quantity: 1,
    });
  }

  addProduct(product: OrderProduct): void {
    this.upsertCartItem({
      id: product.id,
      kind: 'product',
      name: product.name,
      price: product.price,
      currency: product.currency,
      quantity: 1,
    });
  }

  incrementItem(itemId: string, kind: OrderCartItem['kind']): void {
    this.cartItems.update((items) =>
      items.map((item) =>
        item.id === itemId && item.kind === kind ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  decrementItem(itemId: string, kind: OrderCartItem['kind']): void {
    this.cartItems.update((items) =>
      items
        .map((item) =>
          item.id === itemId && item.kind === kind ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  getItemQuantity(itemId: string, kind: OrderCartItem['kind']): number {
    return this.cartItems().find((item) => item.id === itemId && item.kind === kind)?.quantity ?? 0;
  }

  private upsertCartItem(cartItem: OrderCartItem): void {
    this.cartItems.update((items) => {
      const existingItem = items.find((item) => item.id === cartItem.id && item.kind === cartItem.kind);

      if (!existingItem) {
        return [...items, cartItem];
      }

      return items.map((item) =>
        item.id === cartItem.id && item.kind === cartItem.kind
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  private readStoredSelectedRestaurant(): Restaurant | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const storedRestaurant = sessionStorage.getItem(this.selectedRestaurantStorageKey);

    if (!storedRestaurant) {
      return null;
    }

    try {
      return JSON.parse(storedRestaurant) as Restaurant;
    } catch {
      sessionStorage.removeItem(this.selectedRestaurantStorageKey);
      return null;
    }
  }

  private writeStoredSelectedRestaurant(restaurant: Restaurant): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(this.selectedRestaurantStorageKey, JSON.stringify(restaurant));
  }
}
